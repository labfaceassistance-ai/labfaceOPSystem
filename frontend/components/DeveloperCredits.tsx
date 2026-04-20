import { Mail, Github, Linkedin } from 'lucide-react';

export default function DeveloperCredits() {
    const developers = [
        {
            name: "John Lloyd Glason",
            role: "Full Stack Developer",
            email: "johnlloyd.glason@example.com",
            phone: "+63 912 345 6789"
        },
        {
            name: "Team Member 2",
            role: "AI/ML Engineer",
            email: "member2@example.com",
            phone: "+63 912 345 6790"
        },
        {
            name: "Team Member 3",
            role: "Frontend Developer",
            email: "member3@example.com",
            phone: "+63 912 345 6791"
        }
    ];

    return (
        <div className="bg-maroon-950 border-t border-white/10 mt-12 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                {/* Header */}
                <div className="text-center mb-16">
                    <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Development Team</h3>
                    <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-[0.15em] leading-relaxed">
                        Polytechnic University of the Philippines - Lopez, Quezon
                    </p>
                </div>

                {/* Developer Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {developers.map((dev, idx) => (
                        <div
                            key={idx}
                            className="bg-black/40 border border-white/5 rounded-2xl p-8 hover:border-brand-gold/30 transition-all shadow-inner group relative overflow-hidden"
                        >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold font-black text-2xl mb-6 shadow-2xl border border-brand-gold/20">
                                    {dev.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <h4 className="font-black text-white mb-1 uppercase tracking-[0.15em]">{dev.name}</h4>
                                <p className="text-[10px] font-black text-brand-gold/80 mb-6 uppercase tracking-[0.2em]">{dev.role}</p>
                                <div className="space-y-3 text-[10px] font-bold text-secondary/40 w-full uppercase tracking-[0.15em]">
                                    <div className="flex items-center gap-3 justify-center group-hover:text-white transition-colors">
                                        <Mail size={14} className="text-brand-gold/40" />
                                        <a href={`mailto:${dev.email}`} className="hover:text-brand-gold transition-colors">
                                            {dev.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3 justify-center group-hover:text-white transition-colors">
                                        <span className="text-brand-gold/40 opacity-50">📱</span>
                                        <span>{dev.phone}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="border-t border-white/5 pt-12 text-center">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-[10px] font-bold text-secondary/40 uppercase tracking-[0.15em]">
                            <p className="mb-2">
                                © {new Date().getFullYear()} LabFace Index. OS Layer v2.0
                            </p>
                            <p className="text-secondary/20 font-black">
                                Polytechnic University of the Philippines - Lopez Campus
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black text-secondary/40 uppercase tracking-[0.15em]">
                            <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                                <Mail size={18} className="text-brand-gold" />
                            </div>
                            <a
                                href="mailto:support@labface.site"
                                className="hover:text-brand-gold transition-all"
                            >
                                support@labface.site
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
