import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Star, Quote, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  name: string;
  company: string;
  region: string;
  type: string;
  rating: number;
  comment: string;
  image?: string;
  companyLogo?: string;
  companyWebsite?: string;
}

const Testimonials = () => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default testimonials
  const defaultTestimonials: Testimonial[] = [
    {
      id: "1",
      name: "KOFFI Inocent",
      company: "AGRICAPITAL SARL",
      region: "Daloa",
      type: "SARL",
      rating: 5,
      comment: "Service rapide et professionnel. L'équipe Legal Form a été disponible à chaque étape de la création de mon entreprise agricole. Je recommande vivement leurs services.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "2",
      name: "KOUASSI Marie",
      company: "TECHNOVATE SARL",
      region: "Abidjan",
      type: "SARL",
      rating: 5,
      comment: "J'ai créé mon entreprise en moins d'une semaine. Excellent accompagnement ! L'équipe est réactive et très professionnelle. Tous mes documents ont été traités rapidement.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "3",
      name: "DIALLO Amadou",
      company: "BATIR CI SARL",
      region: "Bouaké",
      type: "SARL",
      rating: 5,
      comment: "Processus simplifié, équipe compétente. Je recommande vivement Legal Form pour toute création d'entreprise. Le suivi est excellent du début à la fin.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "4",
      name: "TRAORE Fatoumata",
      company: "MODE AFRIQUE",
      region: "Korhogo",
      type: "SUARL",
      rating: 5,
      comment: "Très satisfaite de l'accompagnement personnalisé. Legal Form m'a aidé à concrétiser mon rêve de créer ma propre marque de mode. Service impeccable !",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "5",
      name: "YAO Kouadio",
      company: "TRANSPORT EXPRESS",
      region: "San-Pédro",
      type: "SARL",
      rating: 5,
      comment: "Professionnalisme et réactivité au rendez-vous. Mon entreprise de transport a été créée dans les délais annoncés avec tous les documents nécessaires.",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "6",
      name: "BAMBA Mariam",
      company: "BEAUTE NATURELLE",
      region: "Yamoussoukro",
      type: "SUARL",
      rating: 5,
      comment: "Un grand merci à toute l'équipe ! J'ai pu lancer mon entreprise de cosmétiques naturels sans stress grâce à leur accompagnement de qualité.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
    }
  ];

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('created_companies')
          .select('*')
          .eq('show_publicly', true)
          .not('testimonial', 'is', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped = data.map(item => ({
            id: item.id,
            name: item.founder_name,
            company: item.name,
            region: item.region,
            type: item.type,
            rating: item.rating || 5,
            comment: item.testimonial || "",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
          }));
          setTestimonials([...mapped, ...defaultTestimonials]);
        } else {
          setTestimonials(defaultTestimonials);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        setTestimonials(defaultTestimonials);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, testimonials.length - 2));
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, testimonials.length - 2));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, testimonials.length - 2)) % Math.max(1, testimonials.length - 2));
  };

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + 3);
  if (visibleTestimonials.length < 3 && testimonials.length > 0) {
    visibleTestimonials.push(...testimonials.slice(0, 3 - visibleTestimonials.length));
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
              {t('testimonials.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
                <p className="text-xs md:text-sm text-muted-foreground">{t('testimonials.companiesCreated')}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">4.9/5</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">{t('testimonials.averageRating')}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">14</div>
                <p className="text-xs md:text-sm text-muted-foreground">{t('testimonials.regionsCovered')}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">7j</div>
                <p className="text-xs md:text-sm text-muted-foreground">{t('testimonials.averageTime')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Testimonials Carousel */}
          <div className="relative mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{t('testimonials.title')}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={prevSlide} className="rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextSlide} className="rounded-full">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500">
                {visibleTestimonials.map((testimonial, index) => (
                  <Card key={`${testimonial.id}-${index}`} className="border-2 hover:shadow-strong transition-all animate-fade-in">
                    <CardContent className="p-6">
                      {/* Photo with gradient border */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative">
                          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary via-accent to-primary"></div>
                          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-background">
                            <img 
                              src={testimonial.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"} 
                              alt={testimonial.name}
                              className="w-full h-full object-cover object-center"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face";
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{testimonial.name}</p>
                          <p className="text-sm text-primary font-medium">{testimonial.company}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-accent fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>

                      <Quote className="h-6 w-6 text-primary/20 mb-2" />
                      <p className="text-muted-foreground mb-4 italic leading-relaxed text-sm">
                        "{testimonial.comment}"
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                            {testimonial.type}
                          </span>
                          <span className="text-xs text-muted-foreground">{testimonial.region}</span>
                        </div>
                        {testimonial.companyWebsite && (
                          <a 
                            href={testimonial.companyWebsite} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Site web
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Carousel indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.max(1, testimonials.length - 2) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-hero rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl mb-4">
              {t('testimonials.joinClients')}
            </h2>
            <p className="text-base md:text-lg mb-6 text-white/90 max-w-2xl mx-auto">
              {t('testimonials.trustUs')}
            </p>
            <Link to="/create">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white shadow-strong text-base md:text-lg px-6 md:px-8 py-4 md:py-6 h-auto font-semibold">
                {t('nav.createCompany')}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Testimonials;
