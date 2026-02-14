"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner"

export default function AuthPage() {
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        try {
            setLoading(true);
            const checkSession = async () => {
                const { data } = await supabase.auth.getUser();
                if (data.user) {
                    window.location.href = "/chat";
                }
            };

            checkSession();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const signUp = async () => {
        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        setLoading(false);

        if (error) alert(error.message);
        else alert("Check your email to confirm!");
    };

    const signIn = async () => {
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) alert(error.message);
        else window.location.href = "/chat";
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-muted">
            <Spinner />
        </div>
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>AI Chat Login</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div>
                        <Label>Email</Label>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Password</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <Button onClick={signIn} className="w-full" disabled={loading}>
                        Sign In
                    </Button>

                    <Button variant="outline" onClick={signUp} className="w-full">
                        Sign Up
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
