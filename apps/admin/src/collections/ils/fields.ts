import { optionsFrom } from '../lms/constants';

export const SCHOOL_KEYS = ['fred-do-frio', 'cte'] as const;

export const schoolKeyField = {
  name: 'schoolKey' as const,
  type: 'select' as const,
  index: true,
  label: 'Escola',
  options: [
    { label: 'Fred do Frio', value: 'fred-do-frio' },
    { label: 'CTE', value: 'cte' },
  ],
};

export const ilsGroup = 'ILS Inteligente';

export { optionsFrom };
