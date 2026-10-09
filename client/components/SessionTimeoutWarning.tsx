import { useState, useEffect, useCallback } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionTimeoutWarningProps {
    /** Remaining time until session expires (in seconds) */
    remainingSeconds: number;
    /** Callback when user clicks "Stay Logged In" */
    onStayLoggedIn: () => void;
    /** Callback when user clicks "Logout" or time expires */
    onLogout: () => void;
    /** Whether the warning dialog should be shown */
    isOpen: boolean;
    /** Callback when the dialog should close */
    onClose: () => void;
}

export function SessionTimeoutWarning({
    remainingSeconds: initialSeconds,
    onStayLoggedIn,
    onLogout,
    isOpen,
    onClose,
}: SessionTimeoutWarningProps) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

    // Update countdown timer
    useEffect(() => {
        if (!isOpen) {
            setSecondsLeft(initialSeconds);
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, initialSeconds, onLogout]);

    const formatTime = useCallback((seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const progressPercentage = ((initialSeconds - secondsLeft) / initialSeconds) * 100;

    const handleStayLoggedIn = () => {
        onStayLoggedIn();
        onClose();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-warning" />
                        Session Expiring Soon
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                        <p>
                            Your session will expire in{' '}
                            <span className="font-bold text-foreground">{formatTime(secondsLeft)}</span>.
                        </p>
                        <p className="text-sm">
                            You will be automatically logged out for security reasons. Click "Stay Logged In" to
                            continue your session.
                        </p>

                        {/* Visual countdown progress bar */}
                        <div className="space-y-2">
                            <Progress value={progressPercentage} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Time remaining</span>
                                <span>{formatTime(secondsLeft)}</span>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel asChild>
                        <Button variant="outline" onClick={onLogout} className="sm:flex-1">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout Now
                        </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button onClick={handleStayLoggedIn} className="sm:flex-1">
                            <Clock className="mr-2 h-4 w-4" />
                            Stay Logged In
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
