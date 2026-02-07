import { useLocation } from "react-router-dom";

export default function Placeholder() {
    const location = useLocation();
    const pageName = location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.slice(2);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">Página en construcción</h1>
                <p className="text-muted-foreground font-medium">Próximamente</p>
            </div>
        </div>
    );
}
