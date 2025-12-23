import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Nexus Calendar",
    description: "A modern AI-powered calendar application",
};

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
                {children}
            </body>
        </html>
    );
}
