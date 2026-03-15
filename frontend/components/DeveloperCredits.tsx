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
        <div className="bg-slate-900 border-t border-slate-800 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <h3 className="text-2xl font-bold text-white mb-2">Development Team</h3>
                    <p className="text-slate-400">
                        Polytechnic University of the Philippines - Lopez, Quezon
                    </p>
                </div>

                {/* Developer Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {developers.map((dev, idx) => (
                        <div
                            key={idx}
                            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-brand-500/50 transition-all"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xl mb-4">
                                    {dev.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <h4 className="font-bold text-white mb-1">{dev.name}</h4>
                                <p className="text-sm text-brand-400 mb-4">{dev.role}</p>
                                <div className="space-y-2 text-sm text-slate-400 w-full">
                                    <div className="flex items-center gap-2 justify-center">
                                        <Mail size={14} />
                                        <a href={`mailto:${dev.email}`} className="hover:text-brand-400 transition-colors">
                                            {dev.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center">
                                        <span>📱</span>
                                        <span>{dev.phone}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="border-t border-slate-800 pt-8 text-center">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-400">
                            <p className="mb-1">
                                © {new Date().getFullYear()} LabFace. All rights reserved.
                            </p>
                            <p>
                                Polytechnic University of the Philippines - Lopez Campus
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Mail size={16} />
                            <a
                                href="mailto:support@labface.site"
                                className="hover:text-brand-400 transition-colors"
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
