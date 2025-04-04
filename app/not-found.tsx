import Link from "next/link";
import Image from "next/image";

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Not Found | Porkfolio",
    description: "The page you are looking for doesn't exist",
};

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="max-w-md text-center">
                <div className="mb-6">
                    <Image
                        src="/404.gif"
                        alt="404 Error"
                        width={300}
                        height={200}
                        className="mx-auto"
                    />
                </div>
                <h1 className="text-4xl font-bold mb-4">Page not found</h1>
                <p className="text-gray-500 mb-8">The page you are looking for doesn't exist</p>
                <Link href="/portfolio"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-black rounded-md shadow-sm hover:bg-gray-800">
                    Go to Portfolio
                </Link>
            </div>
        </div>
    );
} 