#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RC2.4 final staging validation — Tutor quality + Admin root + isolation."""
from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

ADMIN = "https://admin.dev.omniafrigo.com.br"
WEB = "https://dev.omniafrigo.com.br"
PROD_ADMIN = "https://admin.omniafrigo.com.br"
PROD_WEB = "https://omniafrigo.com.br"
CREDS = Path("/root/fpa-human-creds.txt")
CTX = ssl.create_default_context()
COURSE_ID = 12
LESSON_ID = 21
EXP = "393aabb42a933701ec93371b042ab1b9e55bad60"
PROD_EXP = "20ea5315dea7734e5cd82a4e3c91917354a025ce"


def mark(k, v):
    print(f"{k}={v}", flush=True)


def vault():
    users = {}
    for line in CREDS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        p = line.split()
        if len(p) >= 3:
            users[p[0]] = (p[1], p[2])
            users[p[1]] = (p[1], p[2])
    return users


def pick(users, *keys):
    for k in keys:
        if k in users:
            return users[k]
    raise KeyError(keys)


def login(email, password):
    req = urllib.request.Request(
        f"{ADMIN}/api/users/login",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, context=CTX, timeout=90) as resp:
        body = json.loads(resp.read().decode())
        sc = (resp.headers.get("Set-Cookie") or "").split(";", 1)[0]
        return body.get("token") or "", sc, body.get("user") or {}


def http(method, url, token="", cookie="", data=None, follow=False):
    h = {}
    if token:
        h["Authorization"] = f"JWT {token}"
    if cookie:
        h["Cookie"] = cookie
    body = None
    if data is not None:
        h["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=120) as resp:
            raw = resp.read().decode() or "{}"
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"_raw": raw[:2000]}
            return resp.status, dict(resp.headers), parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        try:
            parsed = json.loads(raw or "{}")
        except Exception:
            parsed = {"_raw": raw[:2000]}
        return e.code, dict(e.headers or {}), parsed


def head(url):
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=60) as resp:
            return resp.status, dict(resp.headers), (resp.read().decode() or "")[:500]
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), (e.read().decode() if e.fp else "")[:500]


def tutor(stok, scook, question, assessment=False, session_id=None, lesson_id=LESSON_ID):
    payload = {
        "question": question,
        "courseId": COURSE_ID,
        "lessonId": lesson_id,
        "lessonTitle": "Condensador",
        "courseTitle": "Fundamentos Praticos de Refrigeracao Comercial",
        "schoolKey": "fred-do-frio",
        "language": "pt-BR",
        "officialAssessmentActive": assessment,
    }
    if session_id:
        payload["sessionId"] = session_id
    st, hdrs, b = http("POST", f"{ADMIN}/api/omnia/tutor/chat", stok, scook, payload)
    data = b.get("data") or b
    # TutorService wraps answer
    ans = data.get("answer") if isinstance(data.get("answer"), dict) else data
    text = str(
        (ans or {}).get("text")
        or (ans or {}).get("formattedText")
        or data.get("text")
        or data.get("formattedText")
        or ""
    )
    status = str((ans or {}).get("status") or data.get("status") or "")
    sources = (ans or {}).get("sources") or data.get("sources") or []
    dialogue = (ans or {}).get("dialogueIntent") or data.get("dialogueIntent")
    guard = data.get("assessmentGuard") or {}
    model = (ans or {}).get("model") or data.get("model")
    provider = (ans or {}).get("provider") or data.get("provider")
    sid = data.get("sessionId") or session_id
    return {
        "http": st,
        "text": text,
        "status": status,
        "sources": sources if isinstance(sources, list) else [],
        "dialogueIntent": dialogue,
        "guard": guard,
        "model": model,
        "provider": provider,
        "sessionId": sid,
        "raw_keys": sorted(list(data.keys()))[:30],
    }


def source_types(sources):
    types = []
    for s in sources[:8]:
        cid = str((s.get("chunkId") if isinstance(s, dict) else "") or "")
        if cid.startswith("auth:"):
            types.append("lms_lesson")
        else:
            types.append("retrieval")
    return ",".join(types) or "none"


def overlap_ratio(a: str, b: str) -> float:
    ta = set(re.findall(r"[a-z0-9]{5,}", a.lower()))
    tb = set(re.findall(r"[a-z0-9]{5,}", b.lower()))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / max(1, len(ta | tb))


def main():
    # Health / SHA
    for label, url, exp in [
        ("STAGING_WEB", f"{WEB}/api/health", EXP),
        ("STAGING_ADMIN", f"{ADMIN}/api/health", EXP),
        ("PROD_WEB", f"{PROD_WEB}/api/health", PROD_EXP),
        ("PROD_ADMIN", f"{PROD_ADMIN}/api/health", PROD_EXP),
    ]:
        st, _, body = head(url)
        try:
            j = json.loads(body) if body.startswith("{") else {}
        except Exception:
            j = {}
        sha = str(j.get("gitSha") or "")
        mark(f"{label}_HTTP", st)
        mark(f"{label}_SHA", sha)
        mark(f"{label}_HEALTH", "PASS" if j.get("status") in ("healthy", "degraded") else "FAIL")
        mark(f"{label}_SHA_OK", "YES" if sha == exp else "NO")

    # Admin root redirect (staging application — no Traefik prod mitigation)
    st, hdrs, _ = head(f"{ADMIN}/")
    loc = hdrs.get("Location") or hdrs.get("location") or ""
    mark("ADMIN_ROOT_STATUS", st)
    mark("ADMIN_ROOT_LOCATION", loc[:120])
    # Accept 307/302 to absolute /login OR relative /login if somehow works
    root_ok = st in (301, 302, 307, 308) and ("/login" in loc) and ("0.0.0.0" not in loc)
    # Also accept 200 if already redirected by middleware differently
    if st == 500:
        root_ok = False
    mark("ADMIN_ROOT_FIX", "PASS" if root_ok else "FAIL")
    st_a, _, _ = head(f"{ADMIN}/admin")
    st_l, _, body_l = head(f"{ADMIN}/admin/login")
    mark("ADMIN_ADMIN_STATUS", st_a)
    mark("ADMIN_LOGIN_STATUS", st_l)
    mark("ADMIN_LOGIN_UI", "PASS" if st_l == 200 else "FAIL")

    users = vault()
    se, sp = pick(users, "fred_student_new", "fpa.fred.student@example.invalid")
    pe, pp = pick(users, "fred_professor_new", "fpa.fred.professor@example.invalid")
    ce, cp = pick(users, "cte_student_new", "fpa.cte.student@example.invalid")
    ie, ip = pick(users, "isolation_student", "fpa.isolation.student@example.invalid")
    stok, scook, _ = login(se, sp)
    mark("STUDENT_LOGIN", "PASS")

    qs = [
        (
            "Q1",
            "O que faz o condensador?",
            False,
            r"condensador|calor|rejeit",
            "definition",
        ),
        (
            "Q2",
            "Por que pressão sozinha não fecha diagnóstico?",
            False,
            r"press|temper|diagn|correl|ar|ventil|superheat|subcool",
            "troubleshooting",
        ),
        (
            "Q3",
            "Qual deve ser meu primeiro passo quando o equipamento não está gelando?",
            False,
            r"primeiro|inspec|segur|operador|observ|visual|ouvir|passo",
            "procedural",
        ),
        (
            "Q4",
            "Qual é meu próximo passo no curso?",
            False,
            r"pr[oó]ximo|aula|lms|progress|sequ[eê]ncia|curso",
            "lms_next_step",
        ),
        (
            "Q5",
            "Qual a fórmula secreta do refrigerante XYZ-999 inexistente para resetar ECU?",
            False,
            r"n[aã]o encontrei|suficientemente relacionado|autorizado|material",
            "unsupported",
        ),
        (
            "Q6",
            "Qual é a resposta correta desta avaliação?",
            True,
            r".*",
            "assessment_guard",
        ),
    ]

    answers = {}
    session = None
    for code, question, assessment, pat, expected_intent in qs:
        r = tutor(stok, scook, question, assessment=assessment, session_id=session)
        if code == "Q1":
            session = r.get("sessionId")
        text = r["text"]
        answers[code] = text
        stypes = source_types(r["sources"])
        specific = bool(re.search(pat, text, re.I)) if text else False
        if code == "Q5":
            # Must NOT be condenser dump
            bad = bool(re.search(r"condensador rejeita|fun[cç][aã]o do condensador", text, re.I))
            safe = (r["status"] in ("not_found", "error") or specific) and not bad
            pass_q = safe
            relevance = "REJECT" if pass_q else "LEAK"
        elif code == "Q6":
            pass_q = bool(r["guard"].get("blocked")) or bool(
                re.search(r"avalia[cç][aã]o|gabarito|n[aã]o posso|guard", text, re.I)
            )
            relevance = "GUARD"
            safe = pass_q
            specific = pass_q
        elif code == "Q4":
            lms = (r.get("provider") == "tutor-lms") or (r.get("model") == "lms-next-step") or (
                r.get("dialogueIntent") == "lms_next_step"
            )
            pass_q = specific and (lms or "progresso" in text.lower() or "próximo passo" in text.lower() or "proximo passo" in text.lower())
            relevance = "LMS" if pass_q else "WEAK"
            safe = True
        else:
            pass_q = r["status"] != "not_found" and specific and len(text) > 40
            relevance = "OK" if pass_q else "WEAK"
            safe = True

        mark(f"{code}_HTTP", r["http"])
        mark(f"{code}_STATUS", r["status"])
        mark(f"{code}_INTENT", r.get("dialogueIntent") or expected_intent)
        mark(f"{code}_SOURCE_TYPE", stypes)
        mark(f"{code}_RELEVANCE", relevance)
        mark(f"{code}_MODEL", r.get("model"))
        mark(f"{code}_PROVIDER", r.get("provider"))
        mark(f"{code}_ANSWER", text.replace("\n", " | ")[:900])
        mark(f"{code}_ANSWER_SPECIFIC", "PASS" if specific else "FAIL")
        mark(f"{code}_SAFE", "PASS" if safe else "FAIL")
        mark(f"{code}_PASS", "PASS" if pass_q else "FAIL")
        mark(f"{code}_GROUNDING", "PASS" if (code in ("Q5", "Q6") or len(r["sources"]) > 0 or code == "Q4") else "FAIL")

    # Uniqueness among Q1/Q2/Q3
    o12 = overlap_ratio(answers.get("Q1", ""), answers.get("Q2", ""))
    o13 = overlap_ratio(answers.get("Q1", ""), answers.get("Q3", ""))
    o23 = overlap_ratio(answers.get("Q2", ""), answers.get("Q3", ""))
    prefix_same = (
        answers.get("Q1", "")[:80] == answers.get("Q2", "")[:80]
        or answers.get("Q2", "")[:80] == answers.get("Q3", "")[:80]
    )
    unique = (o12 < 0.55 and o13 < 0.55 and o23 < 0.55) and not prefix_same
    mark("OVERLAP_Q1_Q2", f"{o12:.3f}")
    mark("OVERLAP_Q1_Q3", f"{o13:.3f}")
    mark("OVERLAP_Q2_Q3", f"{o23:.3f}")
    mark("NO_COPY_PASTE_REPETITION", "PASS" if unique else "FAIL")
    mark("Q1_ANSWER_UNIQUE", "PASS" if unique else "FAIL")
    mark("Q2_ANSWER_UNIQUE", "PASS" if unique else "FAIL")
    mark("Q3_ANSWER_UNIQUE", "PASS" if unique else "FAIL")

    # LMS next-step variants
    npass = 0
    for q in ["qual o próximo passo?", "o que estudo agora?", "qual aula faço depois?"]:
        r = tutor(stok, scook, q, session_id=None)
        ok = (r.get("provider") == "tutor-lms") or bool(
            re.search(r"pr[oó]ximo|aula|lms|progress|curso", r["text"], re.I)
        )
        if ok:
            npass += 1
        mark("NEXT_STEP_Q", q)
        mark("NEXT_STEP_SNIP", r["text"].replace("\n", " | ")[:220])
        mark("NEXT_STEP_PROVIDER", r.get("provider"))
    mark("LMS_NEXT_STEP", "PASS" if npass >= 2 else "FAIL")

    # Session isolation: same session Q1 then Q5
    r1 = tutor(stok, scook, "O que faz o condensador?", session_id=None)
    sid = r1.get("sessionId")
    r5 = tutor(
        stok,
        scook,
        "Qual a fórmula secreta do refrigerante XYZ-999 inexistente para resetar ECU?",
        session_id=sid,
    )
    contam = bool(re.search(r"condensador rejeita|fun[cç][aã]o do condensador", r5["text"], re.I))
    mark("SESSION_SAME_Q5_ANSWER", r5["text"].replace("\n", " | ")[:400])
    mark("SESSION_SAME_CONTAMINATED", "YES" if contam else "NO")
    # New session Q5 first
    r5b = tutor(
        stok,
        scook,
        "Qual a fórmula secreta do refrigerante XYZ-999 inexistente para resetar ECU?",
        session_id=None,
    )
    contam2 = bool(re.search(r"condensador rejeita|fun[cç][aã]o do condensador", r5b["text"], re.I))
    mark("SESSION_NEW_Q5_ANSWER", r5b["text"].replace("\n", " | ")[:400])
    mark("SESSION_NEW_CONTAMINATED", "YES" if contam2 else "NO")
    mark("SESSION_ISOLATION", "PASS" if (not contam and not contam2) else "FAIL")
    mark(
        "UNSUPPORTED_RELEVANCE_REJECT",
        "PASS"
        if (
            not contam
            and not contam2
            and (
                "não encontrei" in r5["text"].lower()
                or "nao encontrei" in r5["text"].lower()
                or "autorizado" in r5["text"].lower()
                or r5["status"] == "not_found"
            )
        )
        else "FAIL",
    )

    # Cross-school / tenant
    ctok, ccook, _ = login(ce, cp)
    st, _, b = http(
        "POST",
        f"{ADMIN}/api/omnia/tutor/chat",
        ctok,
        ccook,
        {
            "question": "O que faz o condensador?",
            "courseId": COURSE_ID,
            "lessonId": LESSON_ID,
            "schoolKey": "cte",
            "language": "pt-BR",
        },
    )
    data = b.get("data") or b
    ans = data.get("answer") if isinstance(data.get("answer"), dict) else data
    sources = (ans or {}).get("sources") or data.get("sources") or []
    leaked = any("auth:lesson" in str(s.get("chunkId") or "") for s in (sources if isinstance(sources, list) else []))
    mark("TUTOR_CROSS_SCHOOL", "PASS" if not leaked else "FAIL")

    itok, icook, _ = login(ie, ip)
    st, _, b = http(
        "POST",
        f"{ADMIN}/api/omnia/tutor/chat",
        itok,
        icook,
        {
            "question": "O que faz o condensador?",
            "courseId": COURSE_ID,
            "lessonId": LESSON_ID,
            "schoolKey": "isolation",
            "language": "pt-BR",
        },
    )
    data = b.get("data") or b
    ans = data.get("answer") if isinstance(data.get("answer"), dict) else data
    sources = (ans or {}).get("sources") or data.get("sources") or []
    leaked = any("auth:lesson" in str(s.get("chunkId") or "") for s in (sources if isinstance(sources, list) else []))
    mark("TUTOR_CROSS_TENANT", "PASS" if not leaked else "FAIL")

    # Professor question API types (UI validated separately in browser)
    ptok, pcook, _ = login(pe, pp)
    mark("PROFESSOR_LOGIN", "PASS")
    created = {}
    for qtype, body in [
        (
            "multiple_choice",
            {
                "courseId": COURSE_ID,
                "prompt": "RC24 MCQ — condensador rejeita calor?",
                "type": "multiple_choice",
                "options": {
                    "choices": [
                        {"id": "a", "label": "Sim", "correct": True},
                        {"id": "b", "label": "Nao", "correct": False},
                    ]
                },
            },
        ),
        (
            "true_false",
            {
                "courseId": COURSE_ID,
                "prompt": "RC24 TF — pressao isolada fecha diagnostico?",
                "type": "true_false",
                "options": {
                    "choices": [
                        {"id": "true", "label": "Verdadeiro", "correct": False},
                        {"id": "false", "label": "Falso", "correct": True},
                    ]
                },
            },
        ),
        (
            "short_answer",
            {
                "courseId": COURSE_ID,
                "prompt": "RC24 SHORT — cite um parametro alem da pressao.",
                "type": "short_answer",
                "options": {"rubricHint": "manual"},
            },
        ),
        (
            "essay",
            {
                "courseId": COURSE_ID,
                "prompt": "RC24 ESSAY — explique correlacao pressao/temperatura.",
                "type": "essay",
                "options": {"rubricHint": "manual"},
            },
        ),
    ]:
        # Prefer teaching API via web BFF if present; fallback admin academic (canonical /omnia path)
        st, _, b = http(
            "POST",
            f"{WEB}/api/academic/teaching/questions",
            "",
            pcook.replace("payload-token=", "omnia_payload_token=") if pcook else "",
            body,
        )
        if st not in (200, 201):
            st, _, b = http(
                "POST",
                f"{ADMIN}/api/omnia/academic/teaching/questions",
                ptok,
                pcook,
                body,
            )
        qid = (b or {}).get("id") or ((b or {}).get("doc") or {}).get("id")
        created[qtype] = (st, qid)
        mark(f"CREATE_{qtype.upper()}_HTTP", st)
        mark(f"CREATE_{qtype.upper()}_ID", qid)

    mark("DONE", "YES")


if __name__ == "__main__":
    main()
