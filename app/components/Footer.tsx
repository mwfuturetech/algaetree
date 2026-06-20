import Image from "next/image";
import Link from "next/link";
import Button from "./Button";

const QUICK_LINKS = [
    { label: "Technology", href: "/technology" },
    { label: "About Us", href: "/about" },
    { label: "Team", href: "/team" },
    { label: "News & Events", href: "/news-events" },
    { label: "Blog", href: "/blog" },
];
const CONTACTS = [
    { label: "algae.tree@mushroomworldgroup.com", href: "mailto:algae.tree@mushroomworldgroup.com" },
    { label: "Bhopal, IN" },
    { label: "+91 9893106935", href: "tel:+919893106935" },
    { label: "+91 8823006730", href: "tel:+918823006730" },
];
// const LEGAL = ["Privacy Policy", "Disclaimer", "Terms of use", "Raise a Grievance"];
const SOCIALS = [
    { src: "/figma/linkedin.svg", alt: "LinkedIn", href: "https://in.linkedin.com/company/algaetree" },
    { src: "/figma/instagram.svg", alt: "Instagram", href: "https://www.instagram.com/algaetree_official/" },
    { src: "/social_x-with-circle.svg", alt: "X", href: "https://x.com/TreeAlgae" },
    { src: "/figma/youtube.svg", alt: "YouTube", href: "https://youtube.com/@algaetree" },
]

export default function Footer() {
    return (
        <footer className="w-full">
            <div className="xl:hidden">
                <div className="bg-linear-to-r from-white to-[#5e9357] px-4 py-6">
                    <div className="mx-auto flex w-full max-w-110 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between md:max-w-180">
                        <div className="relative h-10 w-full max-w-[221.333px] overflow-hidden">
                            <Image src="/Logo_Main 1.webp" alt="AlgaeTree" width={186} height={40} className="absolute bottom-0 left-0 h-10 w-auto max-w-full" />
                        </div>
                        <Link href="/contact" className="inline-flex min-h-12 w-full items-center justify-center rounded-4xl bg-[#2d5a27] px-4 py-3 text-center text-[12px] font-medium uppercase tracking-[0.5px] text-white transition-colors hover:bg-[#234820] sm:min-h-0 sm:w-auto">
                            Get Involved
                        </Link>
                    </div>
                </div>

                <div className="bg-[#0d1f00] px-4 py-8">
                    <div className="mx-auto flex w-full max-w-110 flex-col gap-8 md:max-w-180">
                        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-8">
                            <div className="col-span-full row-start-1 flex flex-col gap-6">
                                <div className="w-full max-w-[384px] font-nimbus text-[16px] leading-[26px] text-[#94a3b8]">
                                    <p>Engineering biology to restore the air we breathe.</p>
                                    <p className="font-bold">Together, we can restore the air we share.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {SOCIALS.map((social) => (
                                        <a key={social.alt} href={social.href} target="_blank" rel="noreferrer" aria-label={social.alt} className="flex size- items-center justify-center rounded-[19.2px] ">
                                            <img src={social.src} alt="" width={27} height={27} className="size-[26.88px]" />
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-full flex flex-col gap-6">
                                <div className="min-w-0 flex flex-col gap-3 self-start">
                                    <h4 className="font-nimbus text-[15px] leading-6.5 text-white sm:text-[16px]">Quick Links</h4>
                                    <div className="grid min-w-0 grid-cols-2 gap-x-26 gap-y-2">
                                        <div className="flex min-w-0 flex-col gap-2">
                                            {QUICK_LINKS.slice(0, 2).map((link) => (
                                                <a key={link.label} href={link.href} className="py-1 text-[14px] leading-5 text-[#94a3b8] sm:text-[16px] sm:leading-[25.6px]">{link.label}</a>
                                            ))}
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-2">
                                            {QUICK_LINKS.slice(2).map((link) => (
                                                <a key={link.label} href={link.href} className="py-1 text-[14px] leading-5 text-[#94a3b8] sm:text-[16px] sm:leading-[25.6px]">{link.label}</a>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-0 flex flex-col gap-3 self-start">
                                    <h4 className="font-nimbus text-[15px] leading-6.5 text-white sm:text-[16px]">Contact</h4>
                                    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
                                        <div className="col-span-2 min-w-0">
                                            <a href={CONTACTS[0].href} className="block whitespace-nowrap font-nimbus text-[14px] leading-5 text-[#94a3b8] sm:text-[16px] sm:leading-6.5">
                                                {CONTACTS[0].label}
                                            </a>
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-2">
                                            <a href={CONTACTS[2].href} className="font-nimbus text-[14px] leading-5 text-[#94a3b8] sm:text-[16px] sm:leading-6.5">
                                                {CONTACTS[2].label}
                                            </a>
                                            <a href={CONTACTS[3].href} className="font-nimbus text-[14px] leading-5 text-[#94a3b8] sm:text-[16px] sm:leading-6.5">
                                                {CONTACTS[3].label}
                                            </a>
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-2">
                                            <p className="font-nimbus text-[14px] leading-5 text-[#94a3b8] sm:text-[16px] sm:leading-6.5">{CONTACTS[1].label}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-[#5e5e5e]" />

                        <div className="flex flex-col items-start gap-3 sm:items-center">
                            {/* <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1 text-[12px] leading-[18px] text-[#94a3b8] sm:grid-cols-4">
                                {LEGAL.map((item) => (
                                    <a key={item} href="#" className="py-1 text-left sm:text-center">{item}</a>
                                ))}
                            </div> */}
                            <p className="w-full text-[13px] leading-[20px] text-[#94a3b8] sm:text-[14px]">© 2026 Algae Tree Technologies. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden xl:block w-full">
                <div className="w-full bg-gradient-to-r from-white to-[#5e9357]">
                    <div className="mx-auto flex w-full max-w-[1728px] items-center justify-between px-[120px] py-[24px]">
                        <div className="relative h-[45px] w-[249px] overflow-clip">
                            <Image src="/Logo_Main 1.webp" alt="AlgaeTree" width={209} height={45} className="absolute bottom-0 left-0 h-[45px] w-auto" />
                        </div>
                        <Button href="/contact">Get Involved</Button>
                    </div>
                </div>

                <div className="w-full bg-[#0d1f00]">
                    <div className="mx-auto flex w-full max-w-[1728px] flex-col items-center justify-center gap-[32px] px-[120px] py-[64px]">
                        <div className="grid w-full grid-cols-4 gap-x-[48px] gap-y-[48px] [grid-template-rows:170px]">
                            <div className="col-[1/span_2] row-1 flex flex-col items-start gap-[24px] self-start pb-[10px]">
                                <div className="w-[384px] max-w-[384px]">
                                    <div className="font-nimbus text-[16px] leading-[26px] text-[#94a3b8]">
                                        <p>Engineering biology to restore the air we breathe.</p>
                                        <p className="font-bold">Together, we can restore the air we share.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-[8px]">
                                    {SOCIALS.map((social) => (
                                        <a key={social.alt} href={social.href} target="_blank" rel="noreferrer" aria-label={social.alt} className="flex size-[32px] items-center justify-center rounded-[19.2px] border-[0.32px] border-[#94a3b8]">
                                            <img src={social.src} alt="" width={27} height={27} className="size-[26.88px]" />
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="col-3 row-1 flex flex-col items-start gap-[16px] self-start">
                                <div className="font-nimbus w-full text-[16px] leading-[26px] text-white">Quick Links</div>
                                <div className="flex w-full flex-col items-start">
                                    {QUICK_LINKS.map((link) => (
                                        <div key={link.label} className="relative overflow-clip py-[6px]">
                                            <a href={link.href} className="text-[16px] leading-[25.6px] text-[#94a3b8]">{link.label}</a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="col-4 row-1 flex flex-col items-start gap-[16px] self-start pb-[34px]">
                                <div className="font-nimbus w-full text-[16px] leading-[26px] text-white">Contact</div>
                                <div className="flex w-full flex-col items-start gap-[8px]">
                                    {CONTACTS.map((contact) => (
                                        contact.href ? (
                                            <a key={contact.label} href={contact.href} className="font-nimbus w-full text-[16px] leading-[26px] text-[#94a3b8]">
                                                {contact.label}
                                            </a>
                                        ) : (
                                            <p key={contact.label} className="font-nimbus w-full text-[16px] leading-[26px] text-[#94a3b8]">{contact.label}</p>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-[#1e1e1e]" />

                        <div className="flex w-full items-center justify-center gap-[48px]">
                            <div className="relative h-[20px] min-w-px flex-[1_0_0]">
                                <p className="absolute inset-y-0 left-0 text-[16px] leading-[25.6px] text-[#94a3b8]">© 2026 Algae Tree Technologies. All rights reserved.</p>
                            </div>
                            {/* <div className="flex h-[48px] items-center justify-end">
                                <div className="flex items-center gap-[16px]">
                                    {LEGAL.map((item) => (
                                        <a key={item} href="#" className="flex h-[48px] items-center justify-center rounded-[40px] px-[8px] py-[16px] text-[14px] leading-[21px] text-[#94a3b8]">
                                            {item}
                                        </a>
                                    ))}
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
