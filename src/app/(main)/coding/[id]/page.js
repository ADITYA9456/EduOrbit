'use client';

import DifficultyBadge from '@/components/coding/DifficultyBadge';
import EditorFrame from '@/components/coding/EditorFrame';
import JudgeConsole from '@/components/coding/judge/JudgeConsole';
import ShortcutsDialog from '@/components/coding/judge/ShortcutsDialog';
import { formatMemory, formatRuntime, verdictLabel, VERDICT_META } from '@/components/coding/judge/verdicts';
import { defineEduorbitThemes, useEditorTheme } from '@/components/coding/monacoTheme';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthProvider';
import { useJudgeRunner } from '@/hooks/useJudgeRunner';
import { useStreak } from '@/hooks/useStreak';
import { CODING } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    HiBookmark,
    HiCheckCircle,
    HiChevronLeft,
    HiClock,
    HiCode,
    HiLightBulb,
    HiLightningBolt,
    HiPlay,
    HiQuestionMarkCircle,
    HiXCircle,
} from 'react-icons/hi';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const JUDGE_LANGS = ['javascript', 'python', 'java', 'cpp', 'c'];
const LANG_KEY = 'eduorbite-lang';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_CODE = {
  javascript: "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n// TODO: solve, then console.log the answer\n",
  python: "import sys\n\nlines = sys.stdin.read().split('\\n')\n# TODO: solve, then print the answer\n",
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        // TODO: solve, then print the answer\n    }\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: read with cin, solve, print the answer\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    /* TODO: read with scanf, solve, print the answer */\n    return 0;\n}\n',
};

const LANG_MONACO = { javascript: 'javascript', python: 'python', java: 'java', cpp: 'cpp', c: 'c' };

const PROBLEM_COLUMNS =
  'id,title,slug,description,difficulty,category,type,tags,starter_code,examples,constraints,mcq_options,correct_answer,points,input_format,output_format,editorial,judged,time_limit_ms,memory_limit_kb';

const AI_HINTS = [
  'Think about the data structure that gives you O(1) lookup time.',
  'Consider using a hash map to store previously seen values.',
  'Try breaking the problem into smaller subproblems.',
  'Consider edge cases: empty input, single element, duplicates.',
  'Think about whether a two-pointer approach could work here.',
  'Consider using recursion with memoization.',
  'Draw it out on paper first — visualize the algorithm step by step.',
  'Ask yourself: what is the brute force approach? Can you optimize it?',
];

export default function ProblemPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawContest = searchParams.get('contest');
  const contestId = rawContest && UUID.test(rawContest) ? rawContest : null;

  const supabase = createClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { recordActivity } = useStreak(userId);
  const editorTheme = useEditorTheme();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [submissions, setSubmissions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState('');
  const [mcqAnswer, setMcqAnswer] = useState('');
  const [mcqResult, setMcqResult] = useState(null);
  const [samples, setSamples] = useState([]);
  const [consoleTab, setConsoleTab] = useState('results');
  const [customInput, setCustomInput] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const editorRef = useRef(null);
  const codeByLang = useRef({});
  const codeRef = useRef('');
  const languageRef = useRef('python');
  codeRef.current = code;
  languageRef.current = language;

  const judge = useJudgeRunner({ problemId: problem?.id, contestId });

  // ---------------------------------------------------------------- load problem
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const column = UUID.test(id) ? 'id' : 'slug';
      let { data, error } = await supabase.from('coding_problems').select(PROBLEM_COLUMNS).eq(column, id).maybeSingle();
      if (error) {
        // Columns from migration 001 may not exist yet on this database.
        ({ data } = await supabase.from('coding_problems').select('*').eq(column, id).maybeSingle());
      }
      if (cancelled) return;
      if (data) {
        const { test_cases: _legacyTests, ...safe } = data;
        setProblem(safe);
      }
      setLoading(false);
    }
    load().catch((err) => {
      console.error('Failed to load problem:', err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, supabase]);

  const langOptions = CODING.LANGUAGES.filter((l) => JUDGE_LANGS.includes(l.id));
  const isCodeProblem = problem && problem.type !== 'mcq';
  const judgeable = !!problem && problem.type === 'code' && problem.judged === true;

  const starterFor = useCallback(
    (lang) => problem?.starter_code?.[lang] || DEFAULT_CODE[lang] || '',
    [problem]
  );

  // Code for a language: in-memory edit, else saved draft, else starter.
  const loadCodeFor = useCallback(async (lang) => {
    if (codeByLang.current[lang] != null) {
      setCode(codeByLang.current[lang]);
      return;
    }
    let initial = starterFor(lang);
    if (userId && problem) {
      try {
        const { data } = await supabase
          .from('judge_drafts')
          .select('code')
          .eq('user_id', userId)
          .eq('problem_id', problem.id)
          .eq('language', lang)
          .maybeSingle();
        if (data?.code) initial = data.code;
      } catch { /* drafts are optional */ }
    }
    if (languageRef.current === lang && codeByLang.current[lang] == null) {
      codeByLang.current[lang] = initial;
      setCode(initial);
    }
  }, [problem, userId, supabase, starterFor]);

  // Pick the initial language once the problem is known.
  useEffect(() => {
    if (!problem || problem.type === 'mcq') return;
    let preferred = null;
    try { preferred = localStorage.getItem(LANG_KEY); } catch { /* storage blocked */ }
    const fromStarters = Object.keys(problem.starter_code || {}).find((l) => JUDGE_LANGS.includes(l));
    const first = JUDGE_LANGS.includes(preferred) ? preferred : fromStarters || 'python';
    codeByLang.current = {};
    languageRef.current = first;
    setLanguage(first);
    loadCodeFor(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id, userId]);

  // Sample tests are public by RLS.
  useEffect(() => {
    if (!problem || !judgeable) { setSamples([]); return; }
    let cancelled = false;
    supabase
      .from('problem_tests')
      .select('position, input, expected_output')
      .eq('problem_id', problem.id)
      .eq('is_sample', true)
      .order('position')
      .then(({ data }) => {
        if (cancelled) return;
        setSamples(data || []);
        setCustomInput((prev) => prev || data?.[0]?.input || '');
      });
    return () => { cancelled = true; };
  }, [problem, judgeable, supabase]);

  useEffect(() => {
    if (!userId || !problem) { setBookmarked(false); return; }
    supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', problem.id)
      .maybeSingle()
      .then(({ data }) => setBookmarked(!!data));
  }, [userId, problem, supabase]);

  const handleLangChange = (lang) => {
    codeByLang.current[languageRef.current] = codeRef.current;
    languageRef.current = lang;
    setLanguage(lang);
    judge.clear();
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    loadCodeFor(lang);
  };

  const handleCodeChange = (val) => {
    const next = val || '';
    codeByLang.current[languageRef.current] = next;
    setCode(next);
  };

  // ---------------------------------------------------------------- submissions
  const loadSubmissions = useCallback(async () => {
    if (!userId || !problem) return;
    setSubsLoading(true);
    try {
      const { data } = await supabase
        .from('judge_submissions')
        .select('id, language, verdict, passed_count, total_count, runtime_ms, memory_kb, code, points_earned, created_at')
        .eq('user_id', userId)
        .eq('problem_id', problem.id)
        .eq('kind', 'submit')
        .order('created_at', { ascending: false })
        .limit(30);
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setSubsLoading(false);
    }
  }, [userId, problem, supabase]);

  useEffect(() => {
    if (activeTab === 'submissions') loadSubmissions();
  }, [activeTab, loadSubmissions]);

  // ---------------------------------------------------------------- actions
  const requireReady = useCallback(() => {
    if (!userId) { toast.error('Sign in to run code'); return false; }
    if (!judgeable) { toast.error('This problem has no judge tests yet'); return false; }
    if (!judge.config.configured) { toast.error('The code judge is not configured'); return false; }
    if (!codeRef.current.trim()) { toast.error('Write some code first'); return false; }
    return true;
  }, [userId, judgeable, judge.config.configured]);

  const handleRun = useCallback(async () => {
    if (!requireReady()) return;
    const custom = consoleTab === 'custom';
    await judge.run(languageRef.current, codeRef.current, custom ? customInput : undefined);
  }, [requireReady, judge, consoleTab, customInput]);

  const handleSubmit = useCallback(async () => {
    if (!requireReady()) return;
    setConsoleTab('results');
    const data = await judge.submit(languageRef.current, codeRef.current);
    if (!data) return;
    if (data.verdict === 'accepted') {
      toast.success(data.pointsEarned > 0 ? `Accepted! +${data.pointsEarned} pts` : 'Accepted!');
      recordActivity();
    } else {
      toast.error(`${verdictLabel(data.verdict)}: ${data.passed}/${data.total} tests passed`);
    }
    if (activeTab === 'submissions') loadSubmissions();
  }, [requireReady, judge, recordActivity, activeTab, loadSubmissions]);

  const saveDraft = useCallback(async () => {
    if (!userId || !problem) return toast.error('Sign in to save drafts');
    setSaving(true);
    const { error } = await supabase.from('judge_drafts').upsert(
      {
        user_id: userId,
        problem_id: problem.id,
        language: languageRef.current,
        code: codeRef.current,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,problem_id,language' }
    );
    setSaving(false);
    if (error) {
      console.error('Draft save failed:', error.message);
      return toast.error('Could not save the draft');
    }
    toast.success('Draft saved');
  }, [userId, problem, supabase]);

  const formatCode = useCallback(() => {
    const action = editorRef.current?.getAction('editor.action.formatDocument');
    if (action && action.isSupported()) action.run();
    else toast('No formatter is available for this language');
  }, []);

  // Latest handlers for Monaco commands and the window listener (both are registered once).
  const actions = useRef({});
  actions.current = { run: handleRun, submit: handleSubmit, save: saveDraft, format: formatCode, help: () => setHelpOpen(true) };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, () => actions.current.run());
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter, () => actions.current.submit());
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => actions.current.save());
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Slash, () => editor.trigger('keyboard', 'editor.action.commentLine', null));
    editor.addCommand(KeyMod.Shift | KeyMod.Alt | KeyCode.KeyF, () => actions.current.format());
  };

  // Shortcuts when focus is outside the editor. Monaco calls preventDefault on keys it handled.
  useEffect(() => {
    if (!isCodeProblem) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) actions.current.submit(); else actions.current.run();
      } else if (mod && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); // stop the browser's Save Page dialog
        actions.current.save();
      } else if (e.key === '?' && !mod && !e.altKey) {
        const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], .monaco-editor');
        if (!typing) {
          e.preventDefault();
          actions.current.help();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCodeProblem]);

  const handleMCQSubmit = async () => {
    if (!user) return toast.error('Sign in to submit');
    if (!mcqAnswer) return toast.error('Select an answer');

    const isCorrect = mcqAnswer === problem.correct_answer;
    setMcqResult({ correct: isCorrect, answer: mcqAnswer, expected: problem.correct_answer });

    const score = isCorrect ? (problem.points || 5) : 0;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: problem.id,
          status: isCorrect ? 'solved' : 'attempted',
          languageUsed: 'mcq',
          score,
          submittedCode: mcqAnswer,
        }),
      });
    } catch (err) {
      toast.error('Could not save your progress');
    }

    if (isCorrect) {
      toast.success(`Correct! +${score} pts`);
      recordActivity();
    } else {
      toast.error('Incorrect answer');
    }
  };

  const toggleBookmark = async () => {
    if (!user) return toast.error('Sign in to bookmark');
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: problem.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update bookmark');
      setBookmarked(data.bookmarked);
      toast.success(data.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const showAIHint = () => {
    setHint(AI_HINTS[Math.floor(Math.random() * AI_HINTS.length)]);
    setShowHint(true);
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!problem) return <div className="loading-container"><p>Problem not found</p></div>;

  // MCQ Rendering
  if (problem.type === 'mcq') {
    return (
      <div className="problem-detail--mcq animate-fade-in">
        <div className="mcq">
          <button className="btn btn--ghost btn--sm" onClick={() => router.push('/coding')}>
            <HiChevronLeft size={16} /> Back to Problems
          </button>

          <div className="mcq__head">
            <h1 className="mcq__title">{problem.title}</h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            <Badge tone="info">MCQ</Badge>
            <button
              type="button"
              className={`bookmark-btn ${bookmarked ? 'bookmark-btn--on' : ''}`}
              onClick={toggleBookmark}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
              style={{ marginLeft: 'auto' }}
            >
              <HiBookmark size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="card mcq__question">{problem.description}</div>

          <fieldset className="card mcq__options" disabled={!!mcqResult}>
            <legend className="mcq__legend">Choose your answer</legend>
            {(problem.mcq_options || []).map((option, i) => {
              const isSelected = mcqAnswer === option;
              const showResult = mcqResult !== null;
              const isCorrect = showResult && option === mcqResult.expected;
              const isWrong = showResult && isSelected && !mcqResult.correct;

              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={isSelected}
                  className={`mcq-option ${isSelected ? 'mcq-option--selected' : ''} ${isCorrect ? 'mcq-option--correct' : ''} ${isWrong ? 'mcq-option--wrong' : ''}`}
                  onClick={() => { if (!mcqResult) setMcqAnswer(option); }}
                  disabled={!!mcqResult}
                >
                  <span className="mcq-option__letter">{String.fromCharCode(65 + i)}</span>
                  <span className="mcq-option__text">{option}</span>
                  {isCorrect && <><HiCheckCircle size={20} aria-hidden="true" className="mcq-option__icon" /><span className="sr-only">Correct answer</span></>}
                  {isWrong && <><HiXCircle size={20} aria-hidden="true" className="mcq-option__icon" /><span className="sr-only">Your answer, incorrect</span></>}
                </button>
              );
            })}
          </fieldset>

          {!mcqResult ? (
            <button className="btn btn--primary mcq__submit" onClick={handleMCQSubmit} disabled={!mcqAnswer}>
              Submit answer
            </button>
          ) : (
            <div className={`card mcq__feedback ${mcqResult.correct ? 'card--success' : 'card--error'}`} role="status">
              {mcqResult.correct ? (
                <><HiCheckCircle size={24} aria-hidden="true" /> <strong>Correct!</strong></>
              ) : (
                <><HiXCircle size={24} aria-hidden="true" /> <strong>Incorrect</strong> <span className="mcq__answer">The answer is: {mcqResult.expected}</span></>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'description', label: 'Description' },
    ...(problem.editorial ? [{ id: 'editorial', label: 'Editorial' }] : []),
    { id: 'submissions', label: 'My Submissions' },
  ];
  const runDisabled = !!judge.busy || !judgeable || !judge.config.configured;

  return (
    <div className="problem-detail animate-fade-in">
      {/* Left Panel — Problem */}
      <div className="problem-detail__left">
        <button className="btn btn--ghost btn--sm" onClick={() => router.push(contestId ? `/contests/${contestId}` : '/coding')} style={{ marginBottom: 'var(--space-md)' }}>
          <HiChevronLeft size={16} /> {contestId ? 'Back to contest' : 'Back to Problems'}
        </button>

        {contestId && (
          <p className="judge-note" role="status">
            Contest mode. <strong>Submit</strong> counts toward the standings while the contest is live. Run is practice only.
          </p>
        )}

        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} label="Problem sections" />

        {activeTab === 'description' && (
          <>
            <div className="problem-head">
              <h1 className="problem-head__title">{problem.title}</h1>
              <DifficultyBadge difficulty={problem.difficulty} />
              {problem.category && <span className="badge badge--cat">{problem.category}</span>}
              <span className="problem-head__pts">+{problem.points || 10} pts</span>
              <button
                type="button"
                className={`bookmark-btn ${bookmarked ? 'bookmark-btn--on' : ''}`}
                onClick={toggleBookmark}
                aria-pressed={bookmarked}
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}
                style={{ marginLeft: 'auto' }}
              >
                <HiBookmark size={20} aria-hidden="true" />
              </button>
            </div>

            {!judgeable && (
              <p className="judge-notice judge-notice--warn" role="status">
                This problem has no judge tests yet, so it can be read but not run or submitted.
              </p>
            )}

            <div className="problem-description" style={{ lineHeight: 1.8, marginBottom: 'var(--space-xl)' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{problem.description}</div>
            </div>

            {(problem.input_format || problem.output_format) && (
              <div className="problem-io">
                {problem.input_format && <div><h4>Input</h4><p className="problem-io__text">{problem.input_format}</p></div>}
                {problem.output_format && <div><h4>Output</h4><p className="problem-io__text">{problem.output_format}</p></div>}
              </div>
            )}

            {problem.examples?.length > 0 && (
              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h4>Examples</h4>
                {problem.examples.map((ex, i) => (
                  <div key={i} className="card example-card">
                    <p className="text-sm"><strong>Input</strong></p>
                    <pre className="example-card__pre">{ex.input}</pre>
                    <p className="text-sm"><strong>Output</strong></p>
                    <pre className="example-card__pre">{ex.output}</pre>
                    {ex.explanation && <p className="text-sm text-muted"><strong>Explanation:</strong> {ex.explanation}</p>}
                  </div>
                ))}
              </div>
            )}

            {problem.constraints?.length > 0 && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h4>Constraints</h4>
                <ul style={{ paddingLeft: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
                  {problem.constraints.map((c, i) => (
                    <li key={i} className="text-sm" style={{ marginBottom: 4 }}>{c}</li>
                  ))}
                </ul>
                {judgeable && (
                  <p className="text-sm text-muted">
                    Limits: {(problem.time_limit_ms || 2000) / 1000}s per test, {formatMemory(problem.memory_limit_kb || 262144)} memory.
                    Java code must use the class name <code>Main</code>.
                  </p>
                )}
              </div>
            )}

            {problem.tags?.length > 0 && (
              <div className="flex gap-xs" style={{ marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                {problem.tags.map((t) => (
                  <Badge key={t} tone="accent">{t}</Badge>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <button className="btn btn--secondary btn--sm" onClick={showAIHint}>
                <HiLightBulb size={16} /> Hint
              </button>
              {showHint && (
                <div className="card hint-card" role="status">
                  <p className="text-sm">{hint}</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'editorial' && (
          <div className="problem-description" style={{ lineHeight: 1.8 }}>
            <h2 className="problem-head__title">{problem.title}: approach</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{problem.editorial}</p>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div>
            {!userId ? (
              <p className="text-muted"><Link href="/login">Sign in</Link> to see your submissions.</p>
            ) : subsLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : submissions.length === 0 ? (
              <p className="text-muted">No submissions yet</p>
            ) : (
              <ul className="judge-history">
                {submissions.map((s) => {
                  const ok = s.verdict === 'accepted';
                  return (
                    <li key={s.id} className="card judge-history__item">
                      <div className="flex-between">
                        <strong className={ok ? 'judge-history__ok' : 'judge-history__bad'}>
                          {ok ? <HiCheckCircle size={16} aria-hidden="true" /> : <HiXCircle size={16} aria-hidden="true" />}{' '}
                          {VERDICT_META[s.verdict]?.label || s.verdict}
                        </strong>
                        <span className="text-sm text-muted">
                          {s.language} · {new Date(s.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted judge-history__meta">
                        <span>{s.passed_count}/{s.total_count} tests</span>
                        <span><HiClock size={14} aria-hidden="true" /> {formatRuntime(s.runtime_ms)}</span>
                        <span>{formatMemory(s.memory_kb)}</span>
                        {s.points_earned > 0 && <span className="judge-history__pts">+{s.points_earned} pts</span>}
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            if (JUDGE_LANGS.includes(s.language)) {
                              codeByLang.current[languageRef.current] = codeRef.current;
                              codeByLang.current[s.language] = s.code;
                              languageRef.current = s.language;
                              setLanguage(s.language);
                              setCode(s.code);
                              toast.success('Code restored in the editor');
                            }
                          }}
                        >
                          Restore code
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Right Panel — Editor */}
      <div className="problem-detail__right">
        <div className="editor-toolbar">
          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
            <HiCode size={18} aria-hidden="true" />
            <select
              className="input"
              aria-label="Language"
              value={language}
              onChange={(e) => handleLangChange(e.target.value)}
              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
            >
              {langOptions.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <HiQuestionMarkCircle size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={saveDraft} disabled={saving} title="Save draft (Ctrl/Cmd+S)">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleRun}
              disabled={runDisabled}
              title="Run (Ctrl/Cmd+Enter)"
            >
              {judge.busy === 'run' ? (
                <><HiLightningBolt className="spin" size={14} aria-hidden="true" /> Running…</>
              ) : (
                <><HiPlay size={14} aria-hidden="true" /> Run</>
              )}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSubmit}
              disabled={runDisabled}
              title="Submit (Ctrl/Cmd+Shift+Enter)"
            >
              {judge.busy === 'submit' ? (
                <><HiLightningBolt className="spin" size={14} aria-hidden="true" /> Judging…</>
              ) : (
                <><HiCheckCircle size={14} aria-hidden="true" /> Submit</>
              )}
            </button>
          </div>
        </div>

        <EditorFrame className="editor-container">
          <MonacoEditor
            height="100%"
            language={LANG_MONACO[language] || 'plaintext'}
            path={`${problem.id}.${language}`}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            beforeMount={defineEduorbitThemes}
            theme={editorTheme}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16 },
              lineNumbers: 'on',
              tabSize: 4,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        </EditorFrame>

        <JudgeConsole
          tab={consoleTab}
          onTab={setConsoleTab}
          busy={judge.busy}
          result={judge.result}
          error={judge.error}
          config={judge.config}
          samples={samples}
          customInput={customInput}
          onCustomInput={setCustomInput}
          signedIn={!!userId}
        />
      </div>

      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
