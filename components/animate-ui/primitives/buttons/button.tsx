'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

import { Slot, type WithAsChild } from '@/components/animate-ui/primitives/animate/slot';

type ButtonProps = WithAsChild<
  HTMLMotionProps<'button'> & {
    hoverScale?: number;
    tapScale?: number;
  }
>;

/**
 * Animated button component that applies configurable scale transforms on hover and tap and can render as a Slot child.
 *
 * Renders a motion-enabled button by default or a `Slot` when `asChild` is true, forwarding all other props to the rendered element.
 *
 * @param hoverScale - Scale factor applied while the element is hovered. Default: 1.05
 * @param tapScale - Scale factor applied while the element is tapped. Default: 0.95
 * @param asChild - If true, render a `Slot` so the parent element becomes the interactive element. Default: false
 * @returns A React element representing the animated button with the provided motion interactions.
 */
function Button({
  hoverScale = 1.05,
  tapScale = 0.95,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : motion.button;

  return (
    <Component
      whileTap={{ scale: tapScale }}
      whileHover={{ scale: hoverScale }}
      {...props}
    />
  );
}

export { Button, type ButtonProps };