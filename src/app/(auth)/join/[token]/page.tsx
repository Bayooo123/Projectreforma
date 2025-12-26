
import { verifyInviteToken } from "@/app/actions/join";
import RegisterForm from "@/components/auth/RegisterForm";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function JoinPage(props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const { token } = params;
    const result = await verifyInviteToken(token);

    if (result.error || !result.workspace) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-bold text-red-500">Invalid Link</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        This invite link appears to be invalid or expired.
                    </p>
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    const { workspace } = result;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Join {workspace.name}
                    </h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                        Create your account to join the team.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                    <RegisterForm
                        inviteToken={token}
                        firmName={workspace.name}
                    />
                </div>
            </div>
        </div>
    );
}
