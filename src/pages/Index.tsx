import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageSquare, Calendar, User } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-subtle overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Welcome to EduPlatform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              Your comprehensive learning journey starts here. Engage in conversations, access curated courses, and track your progress.
            </p>
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              <Link to="/conversation">
                <Button size="lg" className="bg-gradient-primary shadow-medium hover:shadow-strong transition-smooth">
                  Get Started
                </Button>
              </Link>
              <Link to="/classroom">
                <Button size="lg" variant="outline" className="shadow-soft hover:shadow-medium transition-smooth">
                  Explore Courses
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/conversation">
              <div className="group p-6 rounded-lg bg-card hover:shadow-medium transition-smooth cursor-pointer border border-border">
                <MessageSquare className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-smooth" />
                <h3 className="text-xl font-semibold mb-2">Conversation</h3>
                <p className="text-muted-foreground">
                  Share ideas, ask questions, and engage with the community
                </p>
              </div>
            </Link>

            <Link to="/classroom">
              <div className="group p-6 rounded-lg bg-card hover:shadow-medium transition-smooth cursor-pointer border border-border">
                <BookOpen className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-smooth" />
                <h3 className="text-xl font-semibold mb-2">My Classroom</h3>
                <p className="text-muted-foreground">
                  Access structured courses tailored to your learning level
                </p>
              </div>
            </Link>

            <Link to="/events">
              <div className="group p-6 rounded-lg bg-card hover:shadow-medium transition-smooth cursor-pointer border border-border">
                <Calendar className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-smooth" />
                <h3 className="text-xl font-semibold mb-2">Events</h3>
                <p className="text-muted-foreground">
                  Stay updated with upcoming workshops and live sessions
                </p>
              </div>
            </Link>

            <Link to="/profile">
              <div className="group p-6 rounded-lg bg-card hover:shadow-medium transition-smooth cursor-pointer border border-border">
                <User className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-smooth" />
                <h3 className="text-xl font-semibold mb-2">My Profile</h3>
                <p className="text-muted-foreground">
                  Track your progress and customize your learning experience
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-primary">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join thousands of learners improving their skills every day
          </p>
          <Link to="/conversation">
            <Button size="lg" variant="secondary" className="shadow-strong hover:scale-105 transition-smooth">
              Join the Conversation
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
