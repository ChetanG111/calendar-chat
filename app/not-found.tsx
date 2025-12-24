"use client";

import React from 'react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 bg-background-dark">
            <h2 className="text-2xl font-bold mb-4 text-white">404 - Page Not Found</h2>
            <p>Could not find requested resource</p>
            <button 
                onClick={() => window.location.href = '/'}
                className="mt-6 px-4 py-2 bg-primary text-white rounded-md hover:brightness-110 transition-all"
            >
                Return Home
            </button>
        </div>
    );
}
