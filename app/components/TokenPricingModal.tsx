"use client";

import React, { useState, useEffect } from "react";
import { Coins, Sparkles, X, Check, Loader2, CreditCard, History } from "lucide-react";
import { getUserTokensAction, purchaseTokenPlanAction, TokenTxRow } from "../actions/token-actions";

interface TokenPricingModalProps {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
  forceBlocked?: boolean; // True if user is blocked due to 0 tokens
}

export default function TokenPricingModal({
  userEmail,
  isOpen,
  onClose,
  onSuccess,
  forceBlocked = false
}: TokenPricingModalProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<TokenTxRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [retailPrice, setRetailPrice] = useState<number>(1.0); // Default ₹1.00

  useEffect(() => {
    if (isOpen && userEmail) {
      loadTokens();
    }
  }, [isOpen, userEmail]);

  const loadTokens = async () => {
    setIsLoading(true);
    const res = await getUserTokensAction(userEmail);
    if (res.success) {
      setBalance(res.tokenBalance);
      setTransactions(res.transactions);
    }

    // Load pricing configurations to scale rates dynamically
    const { getTokenPricingSettingsAction } = await import("../actions/token-actions");
    const pricingRes = await getTokenPricingSettingsAction();
    if (pricingRes.success && pricingRes.settings) {
      setRetailPrice(pricingRes.settings.retailPricePerToken);
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const plans = [
    {
      id: "starter",
      name: "Starter",
      tokens: 50,
      price: Math.round(50 * retailPrice),
      description: "Ideal for testing matching scores & resume parses.",
      color: "#818cf8",
      popular: false,
    },
    {
      id: "pro",
      name: "Professional",
      tokens: 100,
      price: Math.round(100 * retailPrice * 0.9), // 10% discount
      description: "Best for active candidate scouts & custom proposals.",
      color: "#6366f1",
      popular: true,
    },
    {
      id: "agency",
      name: "Agency / Bulk",
      tokens: 300,
      price: Math.round(300 * retailPrice * 0.67), // ~33% discount
      description: "High-volume outreach, cold-emails & syncing campaigns.",
      color: "#4f46e5",
      popular: false,
    }
  ];

  const handleBuyPlan = async (planName: string, tokens: number, price: number) => {
    setBuyingPlan(planName);
    setCheckoutSuccess(null);
    
    // Simulate payment gateway loading state (Razorpay placeholder)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const res = await purchaseTokenPlanAction(userEmail, planName, tokens, price);
    if (res.success) {
      setCheckoutSuccess(`Successfully purchased ${tokens} tokens!`);
      setBalance(res.newBalance ?? (balance + tokens));
      // Reload transaction history
      await loadTokens();
      if (onSuccess && res.newBalance !== undefined) {
        onSuccess(res.newBalance);
      }
      setTimeout(() => setCheckoutSuccess(null), 4000);
    } else {
      alert("Checkout failed: " + res.error);
    }
    setBuyingPlan(null);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.45)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 20,
    }}>
      <div 
        className="animate-fade-in"
        style={{
          background: "var(--card)",
          border: "3px solid var(--foreground)",
          borderRadius: 16,
          boxShadow: "8px 8px 0px 0px var(--foreground)",
          maxWidth: 820,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          animation: "fadeSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Header bar */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "2px solid var(--foreground)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--input)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Coins style={{ width: 22, height: 22, color: "#6366f1" }} />
            <h2 style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: "var(--handwriting-font)",
              color: "var(--foreground)",
              margin: 0
            }}>
              AI Credits & Token pricing
            </h2>
          </div>
          {!forceBlocked && (
            <button 
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--muted-foreground)"
              }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          )}
        </div>

        {/* Modal body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          {forceBlocked && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "2px dashed #ef4444",
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 700,
            }}>
              <span>⚠️</span>
              <span><strong>Balance Exhausted:</strong> You have 0 tokens left. Please choose a plan below to unlock resume parsing, smart matching, and outreach templates.</span>
            </div>
          )}

          {checkoutSuccess && (
            <div style={{
              background: "rgba(34, 197, 94, 0.08)",
              border: "2px solid #22c55e",
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#22c55e",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "3px 3px 0px 0px #22c55e"
            }}>
              <Check style={{ width: 16, height: 16 }} />
              <span>{checkoutSuccess}</span>
            </div>
          )}

          {/* Current balance card */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: "var(--card)",
            border: "2.5px solid var(--foreground)",
            borderRadius: 12,
            boxShadow: "4px 4px 0px 0px var(--foreground)",
          }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted-foreground)" }}>
                Your Balance
              </span>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--foreground)", fontFamily: "var(--handwriting-font)" }}>
                {isLoading ? "..." : `${balance} Tokens`}
              </div>
            </div>
            <div style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: balance > 0 ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
              color: balance > 0 ? "#22c55e" : "#ef4444",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              border: `1.5px solid ${balance > 0 ? "#22c55e" : "#ef4444"}`
            }}>
              {balance > 0 ? "Active Account" : "Credits Required"}
            </div>
          </div>

          {/* Plan cards */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted-foreground)", marginBottom: 12 }}>
              Choose a Token Pack (Rupees ₹)
            </h3>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16
            }}>
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  style={{
                    background: "var(--card)",
                    border: plan.popular ? "3px solid #6366f1" : "2.5px solid var(--foreground)",
                    borderRadius: 12,
                    boxShadow: plan.popular ? "4px 4px 0px 0px #6366f1" : "3px 3px 0px 0px var(--foreground)",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                >
                  {plan.popular && (
                    <span style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#6366f1",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 10,
                      border: "1.5px solid var(--foreground)",
                      boxShadow: "2px 2px 0px 0px var(--foreground)"
                    }}>
                      Popular
                    </span>
                  )}
                  
                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>{plan.name}</h4>
                  
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "12px 0 6px" }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: "var(--foreground)", fontFamily: "var(--handwriting-font)" }}>₹{plan.price}</span>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>One-time</span>
                  </div>

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#6366f1",
                    marginBottom: 12
                  }}>
                    <Sparkles style={{ width: 13, height: 13 }} />
                    <span>{plan.tokens} AI Tokens</span>
                  </div>

                  <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: "0 0 16px", lineHeight: 1.4, flex: 1 }}>
                    {plan.description}
                  </p>

                  <button
                    disabled={buyingPlan !== null}
                    onClick={() => handleBuyPlan(plan.name, plan.tokens, plan.price)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "2px solid var(--foreground)",
                      background: plan.popular ? "#6366f1" : "var(--card)",
                      color: plan.popular ? "#fff" : "var(--foreground)",
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "2px 2px 0px 0px var(--foreground)",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6
                    }}
                    onMouseEnter={e => {
                      if (buyingPlan === null) {
                        e.currentTarget.style.transform = "translate(-1px, -1px)";
                        e.currentTarget.style.boxShadow = "3px 3px 0px 0px var(--foreground)";
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "2px 2px 0px 0px var(--foreground)";
                    }}
                  >
                    {buyingPlan === plan.name ? (
                      <>
                        <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard style={{ width: 14, height: 14 }} />
                        <span>Buy Tokens</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction ledger */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <History style={{ width: 14, height: 14, color: "var(--muted-foreground)" }} />
              <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted-foreground)", margin: 0 }}>
                Recent Transactions Log
              </h3>
            </div>

            <div style={{
              border: "2px solid var(--foreground)",
              borderRadius: 10,
              boxShadow: "3px 3px 0px 0px var(--foreground)",
              overflow: "hidden",
            }}>
              <div style={{
                maxHeight: 180,
                overflowY: "auto",
                background: "var(--card)"
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--input)", borderBottom: "2px solid var(--foreground)" }}>
                      <th style={{ padding: "8px 12px", fontWeight: 800 }}>Date</th>
                      <th style={{ padding: "8px 12px", fontWeight: 800 }}>Type</th>
                      <th style={{ padding: "8px 12px", fontWeight: 800 }}>Description</th>
                      <th style={{ padding: "8px 12px", fontWeight: 800, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                          Loading transactions history...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                          <td style={{ padding: "8px 12px", color: "var(--muted-foreground)" }}>
                            {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 9.5,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              background: 
                                tx.type === "PURCHASE" ? "rgba(34,197,94,0.08)" :
                                tx.type === "GRANT" ? "rgba(99,102,241,0.08)" : "rgba(245,158,11,0.08)",
                              color: 
                                tx.type === "PURCHASE" ? "#22c55e" :
                                tx.type === "GRANT" ? "#6366f1" : "#f59e0b",
                              border: `1px solid ${
                                tx.type === "PURCHASE" ? "#22c55e" :
                                tx.type === "GRANT" ? "#6366f1" : "#f59e0b"
                              }`
                            }}>
                              {tx.type}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{tx.description}</td>
                          <td style={{ 
                            padding: "8px 12px", 
                            fontWeight: 800, 
                            textAlign: "right",
                            color: tx.amount > 0 ? "#22c55e" : "var(--foreground)" 
                          }}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        {!forceBlocked && (
          <div style={{
            padding: "16px 24px",
            borderTop: "2px solid var(--foreground)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--input)"
          }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "2px solid var(--foreground)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "2px 2px 0px 0px var(--foreground)",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "3px 3px 0px 0px var(--foreground)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 0px 0px var(--foreground)";
              }}
            >
              Close Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
