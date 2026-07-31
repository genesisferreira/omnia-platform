import { Badge } from '@omnia/ui';

import { lessonStatusLabel, type LessonUiStatus } from '@/lib/lms/lesson-nav';

export function LessonStatusBadge(props: { status: LessonUiStatus }) {
  const label = lessonStatusLabel(props.status);
  let variant: 'default' | 'secondary' | 'outline' | 'muted' | 'accent' = 'secondary';
  if (props.status === 'completed') variant = 'default';
  else if (
    props.status === 'error' ||
    props.status === 'forbidden' ||
    props.status === 'blocked'
  ) {
    variant = 'outline';
  } else if (props.status === 'offline') variant = 'muted';

  return (
    <Badge variant={variant} aria-label={`Status da aula: ${label}`}>
      {label}
    </Badge>
  );
}
