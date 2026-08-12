'use client';

import * as React from 'react';

import {cn} from '@/lib/utils';

type InfiniteSliderProps = React.ComponentProps<'div'> & {
    direction?: 'horizontal' | 'vertical';
    speed?: number;
    speedOnHover?: number;
};

export function InfiniteSlider({
    children,
    className,
    direction = 'horizontal',
    speed = 40,
    speedOnHover = speed,
    style,
    ...props
}: InfiniteSliderProps) {
    const sliderStyle = {
        '--infinite-slider-duration': `${speed}s`,
        '--infinite-slider-hover-duration': `${speedOnHover}s`,
        ...style,
    } as React.CSSProperties;

    return (
        <div
            className={cn('infinite-slider overflow-hidden', className)}
            data-direction={direction}
            style={sliderStyle}
            {...props}
        >
            <div className="infinite-slider-track">
                <div className="infinite-slider-copy">{children}</div>
                <div className="infinite-slider-copy" aria-hidden="true">{children}</div>
            </div>
        </div>
    );
}
