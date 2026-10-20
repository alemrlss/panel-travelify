import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugificar } from '@/lib/documentacion'
import { clsx } from '@/lib/clsx'

// Render seguro: sin rehype-raw, el HTML escrito en el documento se muestra como
// texto y nunca se ejecuta. Lo usan la vista del documento (servidor) y la vista
// previa del editor (cliente).

function texto(nodo: ReactNode): string {
  return Children.toArray(nodo)
    .map((n) =>
      typeof n === 'string' || typeof n === 'number'
        ? String(n)
        : isValidElement<{ children?: ReactNode }>(n)
          ? texto(n.props.children)
          : ''
    )
    .join('')
}

const componentes: Components = {
  h2: ({ children }) => <h2 id={slugificar(texto(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugificar(texto(children))}>{children}</h3>,
  a: ({ href, children }) => {
    const externo = href?.startsWith('http')
    return (
      <a href={href} {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {children}
      </a>
    )
  },
}

export function Markdown({ contenido, className }: { contenido: string; className?: string }) {
  return (
    <div
      className={clsx(
        'prose prose-invert max-w-none',
        'prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight',
        'prose-a:text-brand-300 prose-a:no-underline hover:prose-a:underline',
        'prose-strong:text-ink prose-code:rounded prose-code:bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:border prose-pre:border-hairline/10 prose-pre:bg-elevated',
        'prose-th:text-ink prose-td:border-hairline/10 prose-hr:border-hairline/10 prose-blockquote:border-brand-500 prose-li:marker:text-brand-400',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentes}>
        {contenido}
      </ReactMarkdown>
    </div>
  )
}
