'use client';

import * as React from 'react';
import { motion, isMotionComponent, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type AnyProps = Record<string, unknown>;

type DOMMotionProps<T extends HTMLElement = HTMLElement> = Omit<
  HTMLMotionProps<keyof HTMLElementTagNameMap>,
  'ref'
> & { ref?: React.Ref<T> };

type WithAsChild<Base extends object> =
  | (Base & { asChild: true; children: React.ReactElement })
  | (Base & { asChild?: false | undefined });

type SlotProps<T extends HTMLElement = HTMLElement> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
} & DOMMotionProps<T>;

/**
 * Combines multiple React refs into a single ref callback.
 *
 * @param refs - One or more refs (functions or ref objects) to be updated with the resolved node
 * @returns A ref callback that assigns the provided DOM/node to each given ref
 */
function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.RefObject<T | null>).current = node;
      }
    });
  };
}

/**
 * Combine a child's props with slot props into a single props object, merging `className` and `style`.
 *
 * @param childProps - Props coming from the child element.
 * @param slotProps - Props provided to the slot; values here override or merge with `childProps`.
 * @returns An object containing the shallow-merged props from `childProps` and `slotProps`. If both sides provide `className`, they are concatenated; if both provide `style`, the resulting style is a shallow merge with `slotProps` taking precedence for overlapping keys.
 */
function mergeProps<T extends HTMLElement>(
  childProps: AnyProps,
  slotProps: DOMMotionProps<T>,
): AnyProps {
  const merged: AnyProps = { ...childProps, ...slotProps };

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className as string,
      slotProps.className as string,
    );
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style as React.CSSProperties),
      ...(slotProps.style as React.CSSProperties),
    };
  }

  return merged;
}

/**
 * Render a child React element as a motion-enabled slot, merging the child's props with slot props and combining refs.
 *
 * @param children - The React element to render; if not a valid React element, nothing is rendered. If the child is already a motion component, its motion identity is preserved.
 * @param ref - Forwarded ref that will be merged with the child's ref and attached to the rendered element.
 * @param props - Additional motion/HTML props to merge with the child's props (className and style are combined).
 * @returns The resulting motion element with merged props and refs, or `null` if `children` is not a valid React element.
 */
function Slot<T extends HTMLElement = HTMLElement>({
  children,
  ref,
  ...props
}: SlotProps<T>) {
  const isAlreadyMotion =
    typeof children.type === 'object' &&
    children.type !== null &&
    isMotionComponent(children.type);

  const Base = React.useMemo(
    () =>
      isAlreadyMotion
        ? (children.type as React.ElementType)
        : motion.create(children.type as React.ElementType),
    [isAlreadyMotion, children.type],
  );

  if (!React.isValidElement(children)) return null;

  const { ref: childRef, ...childProps } = children.props as AnyProps;

  const mergedProps = mergeProps(childProps, props);

  return (
    <Base {...mergedProps} ref={mergeRefs(childRef as React.Ref<T>, ref)} />
  );
}

export {
  Slot,
  type SlotProps,
  type WithAsChild,
  type DOMMotionProps,
  type AnyProps,
};