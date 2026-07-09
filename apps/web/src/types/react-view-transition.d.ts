// Type shim: Next 16 bundles a React build that exports `<ViewTransition>` for the App Router
// (verified: next/dist/compiled/react exports it), but @types/react (19.2) does not type it yet.
// Declare the members we use so TS resolves `import { ViewTransition } from 'react'`; the runtime
// implementation is provided by Next's aliased React. Remove once @types/react ships the type.
import type { ReactNode } from 'react';

declare module 'react' {
  interface ViewTransitionProps {
    name?: string;
    children?: ReactNode;
    enter?: string | Record<string, string>;
    exit?: string | Record<string, string>;
    share?: string;
    default?: string;
  }
  export const ViewTransition: (props: ViewTransitionProps) => ReactNode;
}
