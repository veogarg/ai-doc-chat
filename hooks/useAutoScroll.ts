"use client";

import { useEffect, useRef } from "react";

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
    trigger: unknown
) {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [trigger]);

    return ref;
}
