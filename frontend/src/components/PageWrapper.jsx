    export default function PageWrapper({ children }) {
    return (
        <div className="min-h-full
                        text-zinc-900 dark:text-white
                        transition-colors duration-300">
        {children}
        </div>
    );
    }