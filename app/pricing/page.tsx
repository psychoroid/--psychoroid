'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/contexts/UserContext';
import { PricingCard } from '@/components/pricing/PricingCard';
import { Navbar } from '@/components/design/Navbar';
import { AuthModal } from '@/components/auth/AuthModal';
import { Footer } from '@/components/design/Footer';
import { getStripe } from '@/lib/stripe/stripe';
import { PricingCardProps } from '@/types/components';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase/supabase';

// Define the plan type - remove loadingPlan from required props
type PricingPlan = Omit<PricingCardProps, 'onPurchase' | 'isLoading' | 'isLoggedIn' | 'loadingPlan'>;

const isSubscriber = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .rpc('is_active_subscriber', { p_user_id: userId });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error checking subscription status:', error);
        return false;
    }
};

export default function PricingPage() {
    const { user } = useUser();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [customCredits, setCustomCredits] = useState<number>(1000);
    const [isUserSubscribed, setIsUserSubscribed] = useState(false);
    const CREDIT_PRICE = 0.01; // $0.01 per credit

    useEffect(() => {
        const checkSubscription = async () => {
            if (user) {
                const subscribed = await isSubscriber(user.id);
                setIsUserSubscribed(subscribed);
            }
        };

        checkSubscription();
    }, [user]);

    const pricingPlans: PricingPlan[] = [
        {
            name: 'Discovery',
            price: 0,
            credits: 200,
            features: [
                '200 credits on signup',
                '1 task waiting in queue',
                'Limited queue priority',
                'Assets are under public license',
            ],
            description: 'Try our technology',
            type: 'free' as const
        },
        {
            name: 'Pro',
            price: 14,
            discountedPrice: 12,
            period: 'month',
            yearlyPrice: 144,
            credits: 1000,
            features: [
                '1,200 credits per month',
                '5 tasks waiting in queue',
                'Standard queue priority',
                'Assets are private & customer owned',
                'AI texture editing',
                'Download community assets',
            ],
            description: 'Best for studios and teams',
            type: 'subscription' as const
        },
        {
            name: 'Intense',
            price: 45,
            discountedPrice: 36,
            period: 'month',
            yearlyPrice: 432,
            credits: 4000,
            features: [
                '4,000 credits per month',
                '20 tasks waiting in queue',
                'Top queue priority',
                'Assets are private & customer owned',
                '8 free retries',
                'AI texture editing',
                'Animate your creations',
                'Download community assets',
            ],
            description: 'Unlock Psychoroid\'s full potential',
            type: 'subscription' as const
        }
    ];

    // Add one-time purchase options
    const roidsPacks = [
        {
            name: 'Starter Pack',
            price: 9.99,
            credits: 600,
            type: 'one_time'
        },
        {
            name: 'Plus Pack',
            price: 29.99,
            credits: 2000,
            type: 'one_time'
        },
        {
            name: 'Max Pack',
            price: 59.99,
            credits: 5000,
            type: 'one_time'
        }
    ];

    const calculatePrice = (credits: number) => {
        return (credits * CREDIT_PRICE).toFixed(2);
    };

    const handlePurchaseClick = async (plan: typeof pricingPlans[0]) => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }

        try {
            setLoadingPlan(plan.name);
            console.log('Starting checkout for plan:', plan.name);

            const packageName = plan.type === 'subscription'
                ? `sub_${plan.name.toLowerCase()}`
                : plan.name.toLowerCase();

            console.log('Package name:', packageName);

            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    package: packageName,
                    userId: user.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create checkout session');
            }

            console.log('Got session ID:', data.sessionId);

            const stripe = await getStripe();
            if (!stripe) {
                throw new Error('Failed to load Stripe');
            }

            const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
            if (error) {
                console.error('Stripe checkout error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error initiating checkout:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
        } finally {
            setLoadingPlan(null);
        }
    };

    const handleCustomPurchase = async () => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }

        try {
            setLoadingPlan('custom');
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    package: 'custom',
                    userId: user.id,
                    credits: customCredits,
                    price: calculatePrice(customCredits)
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create checkout session');
            }

            const stripe = await getStripe();
            if (!stripe) {
                throw new Error('Failed to load Stripe');
            }

            const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
            if (error) {
                console.error('Stripe checkout error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error initiating checkout:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="h-svh bg-background flex flex-col overflow-hidden">
            <Navbar />
            <div className="flex-grow overflow-hidden">
                <div className="max-w-3xl mx-auto px-4 py-8 mt-16">
                    <div className="grid grid-cols-12 gap-8">
                        {/* Left side - Title */}
                        <div className="col-span-4">
                            <div className="flex flex-col space-y-1">
                                <h1 className="text-xl font-semibold text-foreground">Pricing</h1>
                                <p className="text-xs text-muted-foreground">
                                    Choose your plan
                                </p>
                            </div>
                        </div>

                        {/* Right side - Content */}
                        <div className="col-span-8 text-foreground">
                            <p className="text-xs text-muted-foreground mt-4 mb-2">
                                From individual creators to professional studios - all plans include access to our AI-powered 3D engine with varying levels of features and priority.
                            </p>
                        </div>
                    </div>

                    {/* Cards Section */}
                    <div className="mt-8 -mx-4">
                        <div className="grid grid-cols-3">
                            {pricingPlans.map((plan, index) => (
                                <div key={index} className="border-r border-t border-b border-border first:border-l">
                                    <PricingCard
                                        {...plan}
                                        onPurchase={() => handlePurchaseClick(plan)}
                                        isLoggedIn={!!user}
                                        loadingPlan={loadingPlan}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Only show custom credits box for authenticated users */}
                        {user && (
                            <div className="grid grid-cols-3">
                                <div className="col-span-3 border-r border-b border-l border-border transition-colors hover:bg-accent/50">
                                    <div className="py-4 px-6 flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground mb-0.5">
                                                    On-demand credits
                                                </h3>
                                                <p className="text-xs text-muted-foreground">1 roid = $0.01</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min="100"
                                                        step="50"
                                                        value={customCredits || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value ? parseInt(e.target.value) : '';
                                                            setCustomCredits(value ? Number(value) : 0);
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = parseInt(e.target.value);
                                                            if (value < 100) {
                                                                setCustomCredits(100);
                                                            }
                                                        }}
                                                        className="w-32 text-sm pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        placeholder="Min. 100"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                        roids
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    = ${calculatePrice(customCredits || 0)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex justify-end">
                                            <Button
                                                onClick={handleCustomPurchase}
                                                variant="outline"
                                                size="sm"
                                                disabled={!isUserSubscribed || loadingPlan === 'custom' || !customCredits || customCredits < 100}
                                                className="px-6 transition-all hover:bg-primary hover:text-primary-foreground"
                                            >
                                                {loadingPlan === 'custom' ? (
                                                    <span className="flex items-center justify-center">
                                                        Processing...
                                                    </span>
                                                ) : !isUserSubscribed ? (
                                                    'Subscribe first'
                                                ) : (
                                                    'Purchase'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    );
}