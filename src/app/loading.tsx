import FluidLoader from "@/components/ui/FluidLoader";

export default function Loading() {
    return (
        <div className="w-full h-full min-h-[500px] flex items-center justify-center">
            <FluidLoader />
        </div>
    );
}
