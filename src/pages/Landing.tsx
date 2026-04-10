import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sprout,
  FlaskConical,
  BarChart3,
  Shield,
  Users,
  Leaf,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: FlaskConical,
    title: "Media Preparation",
    description: "Track media batches, formulations, and contamination notes with ease.",
  },
  {
    icon: Sprout,
    title: "Growth Monitoring",
    description: "Monitor culture growth across inoculation rooms and growth chambers.",
  },
  {
    icon: Shield,
    title: "Contamination Control",
    description: "Early detection and reporting of contamination incidents.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights into production, yields, and trends.",
  },
  {
    icon: Leaf,
    title: "Greenhouse Operations",
    description: "Track hardening, transplanting, and plantlet health.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Role-based access for admins, technicians, and viewers.",
  },
];

const benefits = [
  "Streamline tissue culture workflows",
  "Reduce contamination losses",
  "Track chemical inventory & expiry",
  "Generate production reports",
  "Monitor multiple lab areas",
];

export default function Landing() {
  return (
    <div className="min-h-screen relative bg-background text-foreground">
      {/* Cinematic Video Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="object-cover w-full h-full opacity-90 dark:opacity-75 transition-opacity duration-1000"
        >
          <source src="/landing-bg.mp4" type="video/mp4" />
        </video>
        {/* Adaptive Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background backdrop-blur-sm dark:from-background/40 dark:via-background/70 dark:to-background dark:backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 dark:border-white/5 bg-background/30 dark:bg-background/20 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Sprout className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg hidden sm:inline">DCM Shriram</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sprout className="h-4 w-4" />
                Sugarcane Tissue Culture Management
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                DCM Shriram Tissue Culture{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                  Data Management System
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Streamline your sugarcane tissue culture laboratory operations with our
                comprehensive management platform. Track media preparation, monitor
                contamination, and optimize production.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sign In to Dashboard
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 bg-background/40 backdrop-blur-sm border-y border-white/5">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Everything you need to manage your lab
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From media preparation to greenhouse operations, our platform covers every
                aspect of tissue culture management.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full glass-card hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Boost your lab's efficiency
                </h2>
                <p className="text-muted-foreground mb-8">
                  Our system is designed specifically for sugarcane tissue culture
                  laboratories, helping you maintain quality control and maximize
                  production output.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link to="/signup">
                    <Button size="lg">
                      Get Started Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                      <Sprout className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Ready to grow?</h3>
                    <p className="text-muted-foreground">
                      Join labs already using our platform
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">
              Access your tissue culture laboratory
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Secure internal access for DCM Shriram personnel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Create Free Account
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/20 py-8 px-4 bg-background/60 backdrop-blur-md">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Sprout className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">DCM Shriram Tissue Culture System</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DCM Shriram Ltd. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
