import type { Metadata } from "next";
import "./globals.css";
import { CalendarProvider } from "@/components/providers/CalendarContext";

export const metadata: Metadata = {
    title: "Nexus Calendar",
    description: "A modern AI-powered calendar application",
};

/**
 * Root layout component that renders the HTML document skeleton and provides calendar context for its children.
 *
 * The head includes a small script that applies a persisted theme (`theme` from localStorage) to the document element.
 *
 * @param children - React nodes to be rendered inside the body and wrapped with CalendarProvider
 * @returns The top-level HTML structure (<html>, <head>, <body>) with hydration-safe attributes and calendar context applied to `children`
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var theme = localStorage.getItem('theme') || 'dark';
                                    if (theme === 'dark') {
                                        document.documentElement.classList.add('dark');
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className="h-screen overflow-hidden">
                <CalendarProvider>
                    {children}
                </CalendarProvider>
            </body>
        </html>
    );
}