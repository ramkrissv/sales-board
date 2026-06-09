import { Button } from "@/components/ui/button";
import { BarChart3, Users, Calendar, Target, TrendingUp, Kanban } from "lucide-react";
import galentLogo from '@/assets/galent-logo.svg';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src={galentLogo} alt="Galent" className="h-8" />
            </div>
            <Button 
              asChild 
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-purple-500/25"
            >
              <a href="/api/login" data-testid="button-login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-tight">
                  Manage Your{" "}
                  <span className="bg-gradient-to-r from-[#7c3aed] to-[#00dc82] bg-clip-text text-transparent">
                    Sales Pipeline
                  </span>{" "}
                  Like a Pro
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Track opportunities, manage stakeholders, and close more deals with our intuitive pipeline management platform. Built for modern sales teams.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild 
                  size="lg"
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-purple-500/25"
                >
                  <a href="/api/login" data-testid="button-get-started">Get Started Free</a>
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00dc82]" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00dc82]" />
                  Free forever plan
                </div>
              </div>
            </div>

            {/* Right Column - Feature Preview */}
            <div className="relative">
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-2xl shadow-purple-500/10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                    <Kanban className="h-5 w-5 text-[#7c3aed]" />
                    <span className="font-semibold">Pipeline Overview</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {["Discovery", "Qualification", "Proposal", "Won"].map((stage, i) => (
                      <div key={stage} className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">{stage}</div>
                        <div className="space-y-2">
                          {[...Array(3 - i)].map((_, j) => (
                            <div 
                              key={j} 
                              className="h-16 rounded-lg bg-gradient-to-br from-purple-500/10 to-emerald-500/10 border border-border/30"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">
              Everything You Need to Close Deals
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help sales teams track, manage, and win more opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Kanban className="h-6 w-6" />}
              title="Kanban Board"
              description="Visualize your pipeline with drag-and-drop cards. Move deals through stages effortlessly."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Stakeholder Management"
              description="Track decision-makers and contacts for each opportunity. Never lose context."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Analytics Dashboard"
              description="Get insights into your pipeline health with sales funnel charts and forecasts."
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6" />}
              title="Schedule Board"
              description="Plan your activities with a time-based view of tasks and opportunities."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Deal Tracking"
              description="Monitor TCV, margins, and deal duration. Track service lines and billing models."
            />
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Task Management"
              description="Assign sub-tasks, set priorities, and never miss a follow-up."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Galent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7c3aed]/20 to-[#00dc82]/20 flex items-center justify-center text-[#7c3aed] mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
