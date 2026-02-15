"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants/config";

interface AuthFormProps {
    onSignIn: (email: string, password: string) => Promise<void>;
    onSignUp: (email: string, password: string) => Promise<void>;
    loading?: boolean;
}

export function AuthForm({ onSignIn, onSignUp, loading = false }: AuthFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        try {
            setError(null);
            await onSignIn(email, password);
        } catch (err: any) {
            setError(err.message || "Sign in failed");
        }
    };

    const handleSignUp = async () => {
        try {
            setError(null);
            await onSignUp(email, password);
        } catch (err: any) {
            setError(err.message || "Sign up failed");
        }
    };

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>{APP_NAME} Login</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                <div>
                    <Label className="mb-2">Email</Label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div>
                    <Label className="mb-2">Password</Label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <Button
                    onClick={handleSignIn}
                    className="w-full"
                    disabled={loading || !email || !password}
                >
                    {loading ? "Signing in..." : "Sign In"}
                </Button>

                <Button
                    variant="outline"
                    onClick={handleSignUp}
                    className="w-full"
                    disabled={loading || !email || !password}
                >
                    Sign Up
                </Button>
            </CardContent>
        </Card>
    );
}
