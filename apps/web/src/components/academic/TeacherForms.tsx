'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@omnia/ui';

export function CreateLessonForm({
  courses,
}: {
  courses: Array<{
    id: number;
    title: string;
    modules?: Array<{ id: number; title: string }>;
  }>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ? String(courses[0].id) : '');
  const [moduleId, setModuleId] = useState(
    courses[0]?.modules?.[0]?.id ? String(courses[0].modules[0].id) : '',
  );
  const [type, setType] = useState('text');
  const [msg, setMsg] = useState<string | null>(null);
  const selected = courses.find((c) => String(c.id) === courseId);
  const modules = selected?.modules ?? [];

  async function submit() {
    if (!modules.length) {
      setMsg('Crie um módulo neste curso antes de salvar a aula.');
      return;
    }
    const res = await fetch('/api/academic/teaching/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: Number(courseId),
        moduleId: Number(moduleId),
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type,
      }),
    });
    if (res.ok) {
      setMsg('Aula salva em rascunho.');
      router.push('/professor/rascunhos');
      router.refresh();
      return;
    }
    setMsg('Não foi possível criar a aula.');
  }

  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-sm font-semibold">Nova aula</h2>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Slug (opcional)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={courseId}
        onChange={(e) => {
          setCourseId(e.target.value);
          const next = courses.find((c) => String(c.id) === e.target.value);
          setModuleId(next?.modules?.[0]?.id ? String(next.modules[0].id) : '');
        }}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={moduleId}
        onChange={(e) => setModuleId(e.target.value)}
        required
      >
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="text">Texto</option>
        <option value="video">Vídeo</option>
        <option value="pdf">PDF</option>
        <option value="download">Download</option>
      </select>
      <Button type="submit" size="sm">
        Salvar rascunho
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function PublishLessonButton({ lessonId }: { lessonId: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        const res = await fetch(`/api/academic/teaching/lessons/${lessonId}/publish`, {
          method: 'POST',
        });
        setMsg(res.ok ? 'Publicada.' : 'Falha ao publicar.');
        if (res.ok) router.refresh();
      }}
    >
      {msg || 'Publicar'}
    </Button>
  );
}

export function CreateModuleForm({ courseId }: { courseId: number }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch('/api/academic/teaching/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            title,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          }),
        });
        setMsg(res.ok ? 'Módulo criado.' : 'Não foi possível criar o módulo.');
        if (res.ok) {
          setTitle('');
          router.refresh();
        }
      }}
    >
      <h2 className="text-sm font-semibold">Novo módulo</h2>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Título do módulo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Button type="submit" size="sm">
        Criar módulo
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function CreateCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch('/api/academic/teaching/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            shortDescription: 'Rascunho criado no portal professor.',
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { id?: number; course?: { id?: number }; ok?: boolean }
          | null;
        const id = data?.id ?? data?.course?.id;
        if (res.ok && id) {
          setMsg('Curso criado em rascunho.');
          router.push(`/professor/cursos/${id}`);
          router.refresh();
          return;
        }
        setMsg('Não foi possível criar o curso (verifique escola e permissões).');
      }}
    >
      <h2 className="text-sm font-semibold">Novo curso (rascunho)</h2>
      <p className="text-xs text-muted-foreground">
        O curso fica vinculado automaticamente à sua escola (Fred ≠ CTE).
      </p>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Button type="submit" size="sm">
        Criar curso
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function AttachAssetForm({ lessonId }: { lessonId: number }) {
  const router = useRouter();
  const [mediaId, setMediaId] = useState('');
  const [assetType, setAssetType] = useState('video');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/academic/teaching/lessons/${lessonId}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaId: Number(mediaId),
            assetType,
            title: `Material ${assetType}`,
          }),
        });
        setMsg(res.ok ? 'Anexo salvo.' : 'Falha ao anexar (informe ID da Media).');
        if (res.ok) router.refresh();
      }}
    >
      <input
        className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs"
        placeholder="Media ID"
        value={mediaId}
        onChange={(e) => setMediaId(e.target.value)}
        required
      />
      <select
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        value={assetType}
        onChange={(e) => setAssetType(e.target.value)}
      >
        <option value="video">Vídeo</option>
        <option value="pdf">PDF</option>
        <option value="image">Imagem</option>
        <option value="attachment">Anexo</option>
      </select>
      <Button type="submit" size="sm" variant="outline">
        Anexar
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </form>
  );
}

export function CreateLiveClassForm({ courses }: { courses: Array<{ id: number; title: string }> }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ? String(courses[0].id) : '');
  const [startsAt, setStartsAt] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [platform, setPlatform] = useState('Google Meet');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch('/api/academic/teaching/live-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            courseId: Number(courseId),
            startsAt: new Date(startsAt).toISOString(),
            meetingUrl,
            platform,
            joinWindowMinutes: 15,
          }),
        });
        setMsg(res.ok ? 'Aula ao vivo agendada.' : 'Não foi possível agendar.');
        if (res.ok) {
          setTitle('');
          router.refresh();
        }
      }}
    >
      <h2 className="text-sm font-semibold">Agendar aula ao vivo</h2>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
        required
      />
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="https://meet.google.com/..."
        value={meetingUrl}
        onChange={(e) => setMeetingUrl(e.target.value)}
        required
      />
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Plataforma"
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
      />
      <Button type="submit" size="sm">
        Agendar
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function CreateClassForm({ courses }: { courses: Array<{ id: number; title: string }> }) {
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ? String(courses[0].id) : '');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const res = await fetch('/api/academic/teaching/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, courseId: Number(courseId) }),
    });
    setMsg(res.ok ? 'Turma criada.' : 'Não foi possível criar a turma.');
  }

  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-sm font-semibold">Nova turma</h2>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Nome da turma"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        Criar
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function CreateQuestionForm({ courses }: { courses: Array<{ id: number; title: string }> }) {
  const [prompt, setPrompt] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ? String(courses[0].id) : '');
  const [correct, setCorrect] = useState('b');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const res = await fetch('/api/academic/teaching/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: Number(courseId),
        prompt,
        type: 'multiple_choice',
        options: {
          choices: [
            { id: 'a', label: 'Alternativa A', correct: correct === 'a' },
            { id: 'b', label: 'Alternativa B', correct: correct === 'b' },
          ],
        },
      }),
    });
    const data = (await res.json().catch(() => null)) as { id?: number } | null;
    setMsg(res.ok ? `Questão #${data?.id} criada.` : 'Falha ao criar questão.');
  }

  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-sm font-semibold">Nova questão (múltipla escolha)</h2>
      <textarea
        className="w-full rounded-md border border-border bg-background p-2 text-sm"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        required
      />
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <label className="text-sm">
        Gabarito
        <select
          className="ml-2 rounded-md border border-border bg-background px-2 py-1"
          value={correct}
          onChange={(e) => setCorrect(e.target.value)}
        >
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      </label>
      <Button type="submit" size="sm">
        Criar questão
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function CreateAssessmentForm({
  courses,
  questions,
}: {
  courses: Array<{ id: number; title: string }>;
  questions: Array<{ id: number; prompt: unknown; courseId?: number | null }>;
}) {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ? String(courses[0].id) : '');
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const res = await fetch('/api/academic/teaching/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: Number(courseId),
        title,
        questionIds: selected,
        publish: true,
        maxAttempts: 2,
      }),
    });
    setMsg(res.ok ? 'Avaliação publicada.' : 'Falha ao publicar avaliação.');
  }

  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-sm font-semibold">Nova avaliação</h2>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <div className="space-y-1">
        {questions.map((q) => (
          <label key={q.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(q.id)}
              onChange={(e) =>
                setSelected((prev) =>
                  e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id),
                )
              }
            />
            #{q.id} {String(q.prompt || '').slice(0, 80)}
          </label>
        ))}
      </div>
      <Button type="submit" size="sm">
        Publicar
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function GradeForm({ attemptId }: { attemptId: number }) {
  const [score, setScore] = useState('80');
  const [feedback, setFeedback] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const res = await fetch(`/api/academic/teaching/attempts/${attemptId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: Number(score), feedback, publish: true }),
    });
    setMsg(res.ok ? 'Nota publicada.' : 'Falha ao publicar.');
  }

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />
      <input
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
        placeholder="Feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button type="submit" size="sm">
        Publicar nota
      </Button>
      {msg ? <p className="text-xs">{msg}</p> : null}
    </form>
  );
}

export function EnrollForm({ courses }: { courses: Array<{ id: number; title: string }> }) {
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ? String(courses[0].id) : '');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const res = await fetch('/api/academic/teaching/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: Number(studentId), courseId: Number(courseId) }),
    });
    setMsg(res.ok ? 'Matrícula ativa.' : 'Falha na matrícula.');
  }

  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-sm font-semibold">Matricular aluno</h2>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="ID do aluno"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        required
      />
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        Matricular
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
