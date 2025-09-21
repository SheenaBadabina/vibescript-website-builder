// components/Footer.tsx
// Mobile-first footer with working Terms and Privacy links for VibeScript Builder.

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top: brand + quick links (stack on mobile) */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
              VibeScript
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Speak a website into existence.
            </span>
          </div>

          <nav aria-label="Footer" className="flex w-full flex-wrap gap-x-5 gap-y-2 sm:w-auto sm:items-center sm:justify-end">
            <Link
              href="/terms"
              className="text-sm text-gray-700 underline-offset-4 hover:underline dark:text-gray-300"
              prefetch={false}
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-700 underline-offset-4 hover:underline dark:text-gray-300"
              prefetch={false}
            >
              Privacy Policy
            </Link>
            <Link
              href="/#features"
              className="text-sm text-gray-700 underline-offset-4 hover:underline dark:text-gray-300"
              prefetch={false}
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-gray-700 underline-offset-4 hover:underline dark:text-gray-300"
              prefetch={false}
            >
              Pricing
            </Link>
            <Link
              href="/#contact"
              className="text-sm text-gray-700 underline-offset-4 hover:underline dark:text-gray-300"
              prefetch={false}
            >
              Contact
            </Link>
          </nav>
        </div>

        <div className="my-4 h-px w-full bg-gray-200 dark:bg-gray-800" />

        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} VibeScript. All rights reserved.
          </p>
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-500">
            Built with ❤️ in Eagle Mountain, Utah.
          </p>
        </div>
      </div>
    </footer>
  );
}
