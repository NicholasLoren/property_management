import { Head, Link } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
    module: string;
    title: string;
    content: string;
};

export default function DocsShow({ module, title, content }: Props) {
    return (
        <>
            <Head title={title} />

            <p className="mb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-text-tertiary uppercase">
                {module}
            </p>
            <h1 className="mb-6 font-display text-[24px] font-extrabold tracking-tight">
                {title}
            </h1>

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h2: (props) => (
                        <h2
                            className="mt-9 mb-3 text-[18px] font-bold first:mt-0"
                            {...props}
                        />
                    ),
                    h3: (props) => (
                        <h3
                            className="mt-6 mb-2 text-[15px] font-bold"
                            {...props}
                        />
                    ),
                    p: (props) => (
                        <p
                            className="mb-4 text-[14px] leading-relaxed text-text-secondary"
                            {...props}
                        />
                    ),
                    ul: (props) => (
                        <ul
                            className="mb-4 ml-5 list-disc text-[14px] leading-relaxed text-text-secondary"
                            {...props}
                        />
                    ),
                    ol: (props) => (
                        <ol
                            className="mb-4 ml-5 list-decimal text-[14px] leading-relaxed text-text-secondary marker:font-semibold marker:text-foreground"
                            {...props}
                        />
                    ),
                    li: (props) => <li className="mb-2 pl-1" {...props} />,
                    strong: (props) => (
                        <strong
                            className="font-semibold text-foreground"
                            {...props}
                        />
                    ),
                    code: (props) => (
                        <code
                            className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12.5px]"
                            {...props}
                        />
                    ),
                    a: ({ href, children }) =>
                        href?.startsWith('/') ? (
                            <Link
                                href={href}
                                className="font-medium text-accent-strong hover:underline"
                            >
                                {children}
                            </Link>
                        ) : (
                            <a
                                href={href}
                                className="font-medium text-accent-strong hover:underline"
                            >
                                {children}
                            </a>
                        ),
                    img: ({ alt, ...props }) => (
                        <figure className="mb-6">
                            <img
                                alt={alt}
                                loading="lazy"
                                className="w-full rounded-[10px] border border-border-soft shadow-sm"
                                {...props}
                            />
                            {alt && (
                                <figcaption className="mt-2 text-center text-[12.5px] text-text-tertiary">
                                    {alt}
                                </figcaption>
                            )}
                        </figure>
                    ),
                    hr: () => <hr className="my-8 border-border-soft" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </>
    );
}
