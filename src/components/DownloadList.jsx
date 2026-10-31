import { FileIcon } from './FileIcon'

/**
 * A list of downloadable files: the icon, title, format badge, description and a
 * Download button on each row. Shared by the Downloads page and product pages.
 */
export default function DownloadList({ files }) {
  return (
      <ul className="flex max-w-[900px] flex-col">
        {files.map((file, index) => (
          <li
            key={file.slug}
            className={`flex flex-col gap-5 py-8 sm:flex-row sm:items-start sm:gap-7 ${
              index > 0 ? 'border-t border-gray-100' : 'pt-0'
            }`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fbfbfb]">
              <FileIcon />
            </span>
  
            <div className="flex flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-xl font-bold text-[#24140d] lg:text-[24px]">
                  {file.title}
                </h2>
                <span className="rounded-full border border-royal-blue/20 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
                  {file.format}
                </span>
              </div>
              <p className="font-sans text-base leading-relaxed text-gray-600">
                {file.description}
              </p>
            </div>
  
            <a
              href={file.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark sm:mt-1"
            >
              Download
              <span className="sr-only"> {file.title} ({file.format})</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4v12" />
                <path d="m6.8 11.2 5.2 5.2 5.2-5.2" />
                <path d="M4.5 20h15" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
  )
}
