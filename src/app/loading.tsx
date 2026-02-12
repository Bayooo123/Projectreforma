
import React from 'react';

export default function Loading() {
    return (
        <div className="w-full h-full p-8 animate-pulse">
            <div className="flex flex-col gap-6">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <div className="h-8 w-64 bg-slate-200 rounded-md"></div>
                    <div className="h-10 w-32 bg-slate-200 rounded-md"></div>
                </div>

                {/* Action Row Skeleton */}
                <div className="flex gap-4 mb-4">
                    <div className="h-10 w-full max-w-sm bg-slate-200 rounded-md"></div>
                    <div className="h-10 w-24 bg-slate-200 rounded-md"></div>
                </div>

                {/* Table/Content Skeleton */}
                <div className="space-y-3">
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-md"></div>
                </div>
            </div>
        </div>
    );
}
