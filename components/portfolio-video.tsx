import React, { useRef, useEffect, useState } from "react";

interface PortfolioVideoProps {
    src: string;
    className?: string;
}

export function PortfolioVideo({ src, className = "w-full max-w-sm" }: PortfolioVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Auto-play video when component mounts
        if (videoRef.current) {
            videoRef.current.play().catch(err => console.log("Auto-play failed:", err));
        }
    }, []);

    const handleLoadedData = () => {
        setIsLoaded(true);
    };

    return (
        <div className={`relative overflow-hidden rounded-lg bg-zinc-200 ${className}`}>
            <video
                ref={videoRef}
                src={src}
                className={`w-full ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                muted 
                playsInline 
                loop 
                autoPlay
                onLoadedData={handleLoadedData}
                style={{ transition: 'opacity 0.3s ease' }}
            />
        </div>
    );
} 