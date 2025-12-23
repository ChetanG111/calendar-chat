import * as React from 'react';
import { useInView, type UseInViewOptions } from 'motion/react';

interface UseIsInViewOptions {
  inView?: boolean;
  inViewOnce?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
}

/**
 * Provides a ref for an element and a flag indicating whether that element should be considered in view.
 *
 * @param ref - External ref that will be forwarded to the returned internal ref for the target element.
 * @param options - Configuration:
 *   - `inView` - Optional external control. If provided, `isInView` is `true` only when `inView` is truthy and the element is observed in the viewport; if not provided, `isInView` will be `true` regardless of intersection.
 *   - `inViewOnce` - If `true`, the underlying observer reports viewability only once (defaults to `false`).
 *   - `inViewMargin` - Intersection margin passed to the observer (defaults to `'0px'`).
 * @returns An object with:
 *   - `ref` — a React ref to attach to the target element.
 *   - `isInView` — `true` when the element is considered in view per the provided options, `false` otherwise.
 */
function useIsInView<T extends HTMLElement = HTMLElement>(
  ref: React.Ref<T>,
  options: UseIsInViewOptions = {},
) {
  const { inView, inViewOnce = false, inViewMargin = '0px' } = options;
  const localRef = React.useRef<T>(null);
  React.useImperativeHandle(ref, () => localRef.current as T);
  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;
  return { ref: localRef, isInView };
}

export { useIsInView, type UseIsInViewOptions };