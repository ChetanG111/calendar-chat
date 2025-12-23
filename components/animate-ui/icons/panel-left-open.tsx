'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type PanelLeftOpenProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    rect: {},
    line: {
      initial: { x1: 9, y1: 3, x2: 9, y2: 21 },
      animate: {
        x1: 11,
        y1: 3,
        x2: 11,
        y2: 21,
        transition: { type: 'spring', damping: 18, stiffness: 200 },
      },
    },
    arrow: {
      initial: { x: 0 },
      animate: {
        x: 2,
        transition: { type: 'spring', damping: 18, stiffness: 200 },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

/**
 * Renders the PanelLeftOpen animated icon as a motion-enabled SVG.
 *
 * The icon contains three animated parts (panel rect, divider line, and arrow) whose variants are driven by the shared animation context.
 *
 * @param size - Width and height of the SVG icon (typically a number of pixels or a CSS size string)
 * @returns A React element (motion.svg) for the animated PanelLeftOpen icon
 */
function IconComponent({ size, ...props }: PanelLeftOpenProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect
        width={18}
        height={18}
        x={3}
        y={3}
        rx={2}
        ry={2}
        variants={variants.rect}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={9}
        y1={3}
        x2={9}
        y2={21}
        variants={variants.line}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m14 9 3 3-3 3"
        variants={variants.arrow}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

/**
 * Icon component that renders the animated "PanelLeftOpen" SVG inside IconWrapper.
 *
 * @param props - Props to configure the icon's size and animation variant.
 * @returns The IconWrapper element rendering the PanelLeftOpen icon
 */
function PanelLeftOpen(props: PanelLeftOpenProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  PanelLeftOpen,
  PanelLeftOpen as PanelLeftOpenIcon,
  type PanelLeftOpenProps,
  type PanelLeftOpenProps as PanelLeftOpenIconProps,
};