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
        <html lang="en" className="dark">
            <body className="h-screen overflow-hidden">
                {children}
            </body>
        </html>
    );
}
