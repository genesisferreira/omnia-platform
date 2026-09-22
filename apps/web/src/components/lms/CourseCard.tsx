import Link from 'next/link';
import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
} from '@omnia/ui';

export type CourseCardProps = {
  courseId: number;
  title: string;
  summary?: string | null;
  progressPercent?: number | null;
  status?: 'em_andamento' | 'concluido' | 'nao_iniciado';
};

const statusLabel = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  nao_iniciado: 'Não iniciado',
} as const;

export function CourseCard({
  courseId,
  title,
  summary,
  progressPercent = 0,
  status = 'nao_iniciado',
}: CourseCardProps) {
  const pct = progressPercent ?? 0;
  return (
    <Card className="flex h-full flex-col shadow-lms-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-heading text-lg leading-snug">{title}</CardTitle>
          <Badge variant={status === 'concluido' ? 'default' : 'secondary'}>
            {statusLabel[status]}
          </Badge>
        </div>
        {summary ? (
          <CardDescription className="line-clamp-2">
            {summary.replace(/<[^>]+>/g, '')}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1">
        <Progress value={pct} label="Progresso" />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/lms/cursos/${courseId}`}>Abrir curso</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/lms/continuar?courseId=${courseId}`}>Continuar</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
