'use client';

import { HiCheckCircle, HiClock, HiExclamation, HiXCircle } from 'react-icons/hi';
import { formatMemory, formatRuntime, verdictLabel, VERDICT_META } from './verdicts';

function Block({ title, children, tone }) {
  return (
    <div className={`judge-block ${tone ? `judge-block--${tone}` : ''}`}>
      <div className="judge-block__title">{title}</div>
      <pre className="judge-block__body">{children === '' ? '(empty)' : children}</pre>
    </div>
  );
}

function TestRow({ t }) {
  const ok = t.verdict === 'accepted';
  const label = t.sample ? `Sample ${t.index}` : `Hidden test ${t.index}`;
  const body = (
    <>
      {ok ? <HiCheckCircle size={16} aria-hidden="true" /> : <HiXCircle size={16} aria-hidden="true" />}
      <span className="judge-test__name">{label}</span>
      <span className="judge-test__verdict">{verdictLabel(t.verdict)}</span>
      <span className="judge-test__meta">{formatRuntime(t.runtimeMs)} · {formatMemory(t.memoryKb)}</span>
    </>
  );

  if (!t.sample) return <li className={`judge-test ${ok ? 'judge-test--ok' : 'judge-test--bad'}`}><div className="judge-test__row">{body}</div></li>;

  return (
    <li className={`judge-test ${ok ? 'judge-test--ok' : 'judge-test--bad'}`}>
      <details open={!ok}>
        <summary className="judge-test__row">{body}</summary>
        <div className="judge-test__detail">
          <Block title="Input">{t.input}</Block>
          <Block title="Expected output">{t.expected}</Block>
          <Block title="Your output" tone={ok ? undefined : 'bad'}>{t.actual}</Block>
          {t.stderr ? <Block title="Error output" tone="bad">{t.stderr}</Block> : null}
        </div>
      </details>
    </li>
  );
}

export default function JudgeConsole({
  tab, onTab, busy, result, error, config, samples, customInput, onCustomInput, signedIn,
}) {
  return (
    <section className="judge-console" aria-label="Console">
      <div className="judge-console__tabs" role="tablist">
        {[['results', 'Results'], ['custom', 'Custom input']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`judge-console__tab ${tab === id ? 'judge-console__tab--on' : ''}`}
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="judge-console__body" aria-live="polite">
        {tab === 'custom' && (
          <label className="judge-custom">
            <span className="judge-custom__label">
              Standard input. Press Run (or Ctrl/Cmd+Enter) to execute your code with this input only.
            </span>
            <textarea
              className="input judge-custom__input"
              value={customInput}
              onChange={(e) => onCustomInput(e.target.value)}
              spellCheck={false}
              rows={5}
            />
          </label>
        )}

        {!config.loading && !config.configured && (
          <div className="judge-notice judge-notice--warn" role="status">
            <HiExclamation size={18} aria-hidden="true" />
            <div>
              <strong>Judge not configured.</strong> This deployment has no code execution endpoint set, so
              Run and Submit are turned off. You can still read problems and edit code.
            </div>
          </div>
        )}

        {config.configured && !signedIn && (
          <div className="judge-notice" role="status">Sign in to run and submit code.</div>
        )}

        {error && (
          <div className="judge-notice judge-notice--bad" role="alert">
            <HiXCircle size={18} aria-hidden="true" />
            <div>{error.message}</div>
          </div>
        )}

        {busy && (
          <div className="judge-running" role="status">
            <span className="spinner spinner--sm" aria-hidden="true" />
            {busy === 'submit' ? 'Judging against all tests…' : 'Running…'}
          </div>
        )}

        {!busy && result && result.mode === 'custom' && (
          <div className="judge-result">
            <div className={`judge-verdict ${VERDICT_META[result.verdict]?.ok ? 'judge-verdict--ok' : 'judge-verdict--bad'}`}>
              {VERDICT_META[result.verdict]?.ok ? <HiCheckCircle size={20} aria-hidden="true" /> : <HiXCircle size={20} aria-hidden="true" />}
              <strong>{verdictLabel(result.verdict)}</strong>
              <span className="judge-verdict__meta">
                <HiClock size={14} aria-hidden="true" /> {formatRuntime(result.runtimeMs)} · {formatMemory(result.memoryKb)}
              </span>
            </div>
            {result.compileOutput ? <Block title="Compiler output" tone="bad">{result.compileOutput}</Block> : null}
            <Block title="Output">{result.stdout}</Block>
            {result.stderr ? <Block title="Error output" tone="bad">{result.stderr}</Block> : null}
          </div>
        )}

        {!busy && result && result.mode !== 'custom' && (
          <div className="judge-result">
            <div className={`judge-verdict ${result.verdict === 'accepted' ? 'judge-verdict--ok' : 'judge-verdict--bad'}`}>
              {result.verdict === 'accepted' ? <HiCheckCircle size={20} aria-hidden="true" /> : <HiXCircle size={20} aria-hidden="true" />}
              <strong>{verdictLabel(result.verdict)}</strong>
              <span className="judge-verdict__meta">
                {result.passed}/{result.total} passed · <HiClock size={14} aria-hidden="true" /> {formatRuntime(result.runtimeMs)} · {formatMemory(result.memoryKb)}
              </span>
              {result.pointsEarned > 0 && <span className="judge-verdict__pts">+{result.pointsEarned} pts</span>}
            </div>
            {result.mode === 'submit' && result.contestRecorded && (
              <p className="judge-note">Recorded in the contest standings.</p>
            )}
            {result.compileOutput ? <Block title="Compiler output" tone="bad">{result.compileOutput}</Block> : null}
            <ul className="judge-tests">
              {result.results.map((t) => <TestRow key={t.index} t={t} />)}
            </ul>
          </div>
        )}

        {!busy && !result && !error && tab === 'results' && samples.length > 0 && (
          <div className="judge-result">
            <p className="judge-note">Run executes your code on the sample tests. Submit judges it on every test, including hidden ones.</p>
            <ul className="judge-tests">
              {samples.map((s, i) => (
                <li key={s.position} className="judge-test">
                  <details>
                    <summary className="judge-test__row"><span className="judge-test__name">Sample {i + 1}</span><span className="judge-test__meta">not run yet</span></summary>
                    <div className="judge-test__detail">
                      <Block title="Input">{s.input}</Block>
                      <Block title="Expected output">{s.expected_output}</Block>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
