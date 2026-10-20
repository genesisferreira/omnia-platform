import { Button } from '@omnia/ui';

type PostSearchProps = {
  basePath?: string;
  defaultValue?: string;
  category?: string;
  tag?: string;
};

export function PostSearch({
  basePath = '/blog',
  defaultValue = '',
  category,
  tag,
}: PostSearchProps) {
  return (
    <form action={basePath} method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {tag ? <input type="hidden" name="tag" value={tag} /> : null}
      <label className="flex-1 space-y-2">
        <span className="block text-sm font-medium text-omnia-deep-blue">Buscar no blog</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Título ou resumo..."
          maxLength={80}
          className="h-10 w-full rounded-md border border-omnia-deep-blue/20 bg-omnia-white px-3 text-sm text-omnia-graphite outline-none ring-omnia-emerald focus-visible:ring-2"
        />
      </label>
      <Button
        type="submit"
        className="bg-omnia-deep-blue text-omnia-white hover:bg-omnia-deep-blue/90"
      >
        Buscar
      </Button>
    </form>
  );
}
