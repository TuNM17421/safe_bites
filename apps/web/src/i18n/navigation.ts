import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation primitives. Use these everywhere instead of next/link
// and next/navigation so URLs stay correctly `/en` `/vi` prefixed.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
