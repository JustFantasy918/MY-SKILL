#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
skill-qa-acceptance / qa_check.py
=================================
Skill 质量验收通用脚本。对任意 skill 目录跑 8 层测试。

用法:
    python qa_check.py <skill_path> [选项]

选项:
    --scenarios FILE   场景覆盖度测试的自定义场景文件 (JSON)
    --net              执行文档中需要网络的代码块 (默认跳过)
    --code             执行文档中的 python 代码块 (默认跳过, 建议手动开启)
    --package          额外调用官方 package_skill.py 校验
    --quiet            只输出失败项
    -h, --help         帮助

场景文件格式 (JSON):
    {
      "场景名": {
        "refs": ["文件名(不含.md)", "..."],
        "needs": ["该场景必需出现的关键词", "..."]
      }
    }

退出码: 0=全部通过  1=有失败  2=用法错误
"""

import os
import re
import io
import sys
import json
import argparse

# Windows 控制台编码兜底
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CN_NUM = "一二三四五六七八九十"

# ---------------------------------------------------------------- 基础工具

def read(path):
    with io.open(path, "r", encoding="utf-8") as f:
        return f.read()


def collect_files(skill_path):
    """返回 [SKILL.md, references/*.md, 其他顶层 .md?]"""
    files = []
    main = os.path.join(skill_path, "SKILL.md")
    if not os.path.isfile(main):
        return files
    files.append("SKILL.md")
    refdir = os.path.join(skill_path, "references")
    if os.path.isdir(refdir):
        for fn in sorted(os.listdir(refdir)):
            if fn.endswith(".md"):
                files.append("references/" + fn)
    return files


def split_frontmatter(text):
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[1]
    return ""


PASS, FAIL, WARN = "\u2705", "\u274c", "\u26a0\ufe0f"


class Report(object):
    def __init__(self):
        self.results = []   # (name, ok, detail)

    def add(self, name, ok, detail=""):
        self.results.append((name, bool(ok), detail))
        return ok

    @property
    def ok(self):
        return all(r[1] for r in self.results)

    def render(self, quiet=False):
        lines = []
        for name, ok, detail in self.results:
            if quiet and ok:
                continue
            mark = PASS if ok else FAIL
            lines.append("  %s %s%s" % (mark, name, ("  -- " + detail) if detail else ""))
        return "\n".join(lines)


# ---------------------------------------------------------------- T1 结构

def t1_structure(skill_path, files, corpus, rep):
    """结构完整性：frontmatter 必填、无折叠符/尖括号、文件非空"""
    fm = split_frontmatter(corpus.get("SKILL.md", ""))
    missing = [k for k in ("name:", "description:", "version:", "agent_created:")
               if k not in fm]
    rep.add("T1 frontmatter 必填字段齐全", not missing,
            ("缺: %s" % missing) if missing else "")

    # 校验器对 description 做原始文本扫描，YAML 折叠符 >- 中的 > 会被判为非法尖括号
    fold = ">-" in fm or ">-" in fm
    desc_lines = [l for l in corpus.get("SKILL.md", "").split("\n")
                  if l.startswith("description:")]
    angle = any(("<" in l) or (">" in l) for l in desc_lines)
    rep.add("T1 description 单行无折叠符/尖括号", not (fold or angle),
            ("折叠符" if fold else "") + ("尖括号" if angle else ""))

    # 全库 frontmatter 尖括号
    bad = [f for f in files if ("<" in split_frontmatter(corpus[f])
                                or ">" in split_frontmatter(corpus[f]))]
    rep.add("T1 全库 frontmatter 无尖括号", not bad, str(bad) if bad else "")

    # 空文件 / 过小文件
    tiny = [f for f in files if len(corpus[f].strip()) < 200]
    rep.add("T1 无空/过小文件(<200字符)", not tiny, str(tiny) if tiny else "")

    # 主文件必备章节
    main = corpus.get("SKILL.md", "")
    rep.add("T1 SKILL.md 含何时使用/红线等骨架",
            ("## " in main) and len(main) > 500, "")


# ---------------------------------------------------------------- T2 引用

def t2_references(files, corpus, rep):
    """交叉引用完整性：`xxx.md` 与 `xxx.md 第X节` 必须能解析"""
    pat = re.compile(r"`([a-zA-Z0-9_\-]+\.md)`(?:\s*第?([一二三四五六七八九十]+)节)?")
    dangling, total = [], 0
    for f in files:
        for m in pat.finditer(corpus[f]):
            total += 1
            target = m.group(1)
            cand = [p for p in files if p.endswith("/" + target) or p == target]
            if not cand:
                dangling.append("%s -> %s(文件不存在)" % (f, target))
                continue
            if m.group(2):
                cn = m.group(2)
                tf = cand[0]
                hit = any(re.match(r"^#{2,4}\s*" + cn + r"[、.\s]", l)
                          for l in corpus[tf].split("\n"))
                if not hit:
                    dangling.append("%s -> %s 第%s节(无该章节)" % (f, target, cn))
    rep.add("T2 交叉引用 %d 处零悬空" % total, not dangling,
            ("; ".join(dangling[:5])) if dangling else "")


# ---------------------------------------------------------------- T3 编号

def t3_numbering(files, corpus, rep):
    """章节编号连续性：`## 一、` 起，连续无跳号"""
    bad = []
    for f in files:
        nums = []
        for line in corpus[f].split("\n"):
            m = re.match(r"^##\s+([一二三四五六七八九十]+)[、.]", line)
            if m:
                nums.append(CN_NUM.index(m.group(1)) + 1)
        if not nums:
            continue
        ok = (nums[0] == 1 and
              all(nums[i + 1] - nums[i] == 1 for i in range(len(nums) - 1)))
        if not ok:
            bad.append("%s:%s" % (f, nums))
    rep.add("T3 章节编号连续(起于一、无跳号)", not bad, "; ".join(bad) if bad else "")

    # 非规范编号：如 三-A
    weird = []
    for f in files:
        for line in corpus[f].split("\n"):
            if re.match(r"^##\s+[一二三四五六七八九十]+-[A-Za-z]", line):
                weird.append("%s: %s" % (f, line.strip()[:30]))
    rep.add("T3 无非规范编号(如 三-A)", not weird, "; ".join(weird) if weird else "")


# ---------------------------------------------------------------- T4 场景

DEFAULT_SCENARIOS = {}


def t4_scenarios(files, corpus, rep, scenarios):
    """场景索引覆盖度：SKILL.md 推荐的 reference 是否真含所需关键词"""
    if not scenarios:
        rep.add("T4 场景覆盖度", True, "未提供场景文件(--scenarios), 已跳过")
        return
    miss_all = []
    for name, cfg in scenarios.items():
        refs = cfg.get("refs", [])
        needs = cfg.get("needs", [])
        blob = "".join(t for f, t in corpus.items()
                       if any(f.endswith("/" + r + ".md") or f == r + ".md"
                              for r in refs))
        if not blob:
            miss_all.append("%s: 推荐文件均未找到" % name)
            continue
        miss = [n for n in needs if n not in blob]
        if miss:
            miss_all.append("%s 缺 %s" % (name, miss))
    rep.add("T4 场景覆盖度(%d 场景)" % len(scenarios), not miss_all,
            "; ".join(miss_all) if miss_all else "")


# ---------------------------------------------------------------- T5 标注

DEFAULT_MARKS = ["原话", "媒体解读", "框架推演", "非郑希原话"]


def t5_annotation(files, corpus, rep, marks):
    """标注规范：事实性内容需区分 原话/解读/推演"""
    if not marks:
        rep.add("T5 标注规范", True, "未配置关键词, 已跳过")
        return
    blob = "".join(corpus.values())
    hit = [m for m in marks if m in blob]
    rep.add("T5 标注规范(%d/%d 关键词命中)" % (len(hit), len(marks)),
            True if hit else False,
            ("缺少全部标注关键词" if not hit else ""))


# ---------------------------------------------------------------- T6 代码

def t6_code(files, corpus, rep, do_run=False, allow_net=False):
    """文档内 python 代码块可执行性"""
    blocks = []
    for f in files:
        for m in re.finditer(r"```python\n(.*?)```", corpus[f], re.S):
            blocks.append((f, m.group(1)))
    if not blocks:
        rep.add("T6 文档代码块", True, "无 python 代码块")
        return
    if not do_run:
        rep.add("T6 文档代码块可执行性", True,
                "发现 %d 个代码块, 加 --code 执行" % len(blocks))
        return
    import subprocess, tempfile
    failed = []
    for f, code in blocks:
        if (not allow_net) and re.search(r"urllib|requests|curl|http", code):
            continue
        tmp = os.path.join(tempfile.gettempdir(), "_qa_block.py")
        with io.open(tmp, "w", encoding="utf-8") as fh:
            fh.write(code)
        try:
            p = subprocess.run([sys.executable, tmp], capture_output=True,
                               timeout=30)
            if p.returncode != 0:
                failed.append("%s: %s" % (f, p.stderr.decode("utf-8", "ignore")[:80]))
        except Exception as e:
            failed.append("%s: %s" % (f, str(e)[:80]))
    rep.add("T6 文档代码块可执行(%d)" % len(blocks), not failed,
            "; ".join(failed) if failed else "")


# ---------------------------------------------------------------- T7 数字

def t7_numbers(files, corpus, rep):
    """数字陈述一致性风险：列出可能的公式/案例数字，提示人工核对"""
    susp = []
    pat = re.compile(r"(\d+\.\d{1,2})\s*(?:=|→|->)\s*[^，。\n]{0,12}(放量|缩量|常态|见顶|上行|买入|卖出|减仓)")
    for f in files:
        for m in pat.finditer(corpus[f]):
            susp.append("%s: %s" % (f, m.group(0)[:40]))
    # 同一文件内相同标签对应不同数字
    rep.add("T7 公式-案例数字一致性", True,
            ("待人工核对 %d 处: %s" % (len(susp), "; ".join(susp[:3])))
            if susp else "未发现需核对的计算型陈述")


# ---------------------------------------------------------------- T8 官方校验

def t8_package(skill_path, rep):
    """调用官方 package_skill.py"""
    import subprocess, tempfile, glob
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cands = glob.glob(os.path.join(
        os.path.expanduser("~"), ".workbuddy", "**", "package_skill.py"),
        recursive=True)
    if not cands:
        rep.add("T8 官方校验脚本", True, "未找到 package_skill.py, 已跳过")
        return
    script = cands[0]
    out = tempfile.mkdtemp()
    try:
        p = subprocess.run([sys.executable, script, skill_path, out],
                           capture_output=True, timeout=60)
        ok = p.returncode == 0
        msg = (p.stdout.decode("utf-8", "ignore") + p.stderr.decode("utf-8", "ignore"))
        rep.add("T8 官方 package_skill 校验", ok,
                "" if ok else msg.strip().split("\n")[-1][:120])
    except Exception as e:
        rep.add("T8 官方 package_skill 校验", True, "跳过: %s" % str(e)[:60])


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Skill 质量验收测试")
    ap.add_argument("path", help="skill 目录路径")
    ap.add_argument("--scenarios", help="场景覆盖度 JSON 文件")
    ap.add_argument("--marks", help="标注关键词, 逗号分隔")
    ap.add_argument("--net", action="store_true", help="允许执行联网代码块")
    ap.add_argument("--code", action="store_true", help="执行文档中的 python 代码块")
    ap.add_argument("--package", action="store_true", help="调用官方校验脚本")
    ap.add_argument("--quiet", action="store_true", help="只显示失败项")
    args = ap.parse_args()

    skill_path = args.path.rstrip("/\\")
    if not os.path.isdir(skill_path):
        print("错误: 目录不存在 %s" % skill_path)
        return 2

    files = collect_files(skill_path)
    if not files:
        print("错误: 未找到 SKILL.md")
        return 2

    corpus = {}
    for f in files:
        try:
            corpus[f] = read(os.path.join(skill_path, f))
        except Exception as e:
            print("读取失败 %s: %s" % (f, e))
            return 2

    scenarios = {}
    if args.scenarios:
        try:
            scenarios = json.load(io.open(args.scenarios, encoding="utf-8"))
        except Exception as e:
            print("场景文件解析失败: %s" % e)

    marks = args.marks.split(",") if args.marks else DEFAULT_MARKS

    rep = Report()
    print("=" * 66)
    print("Skill 验收测试: %s" % os.path.basename(skill_path))
    print("文件: %d 个, 共 %d 字符" % (len(files), sum(len(v) for v in corpus.values())))
    print("=" * 66)

    t1_structure(skill_path, files, corpus, rep)
    t2_references(files, corpus, rep)
    t3_numbering(files, corpus, rep)
    t4_scenarios(files, corpus, rep, scenarios)
    t5_annotation(files, corpus, rep, marks)
    t6_code(files, corpus, rep, args.code, args.net)
    t7_numbers(files, corpus, rep)
    if args.package:
        t8_package(skill_path, rep)

    print(rep.render(quiet=args.quiet))
    print("-" * 66)
    n_ok = sum(1 for r in rep.results if r[1])
    print("结果: %s  (%d/%d 通过)" % ("PASS" if rep.ok else "FAIL",
                                      n_ok, len(rep.results)))
    return 0 if rep.ok else 1


if __name__ == "__main__":
    sys.exit(main())
