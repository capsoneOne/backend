"use client";

import {FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState} from 'react';
import {Bot, Heart, Plus, Send, Sparkles, X} from 'lucide-react';
import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type SuggestionKey = 'findStyle' | 'delivery' | 'returns';
type ChatMessage = {id: number; role: 'assistant' | 'user'; body: string};
type Position = {x: number; y: number};

const ROBOT_SIZE = 80;
const VIEWPORT_PADDING = 12;

const suggestionKeys: SuggestionKey[] = ['findStyle', 'delivery', 'returns'];

export function ChatAssistant() {
    const t = useTranslations('ChatAssistant');
    const dragHint = t.has('dragHint') ? t('dragHint') : t('open');
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [robotPosition, setRobotPosition] = useState<Position | null>(null);
    const [panelPosition, setPanelPosition] = useState<Position | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {id: 0, role: 'assistant', body: t('welcome')},
    ]);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextId = useRef(1);
    const suppressClick = useRef(false);
    const dragState = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        origin: Position;
        moved: boolean;
    } | null>(null);

    const keepRobotOnScreen = (position: Position): Position => ({
        x: Math.min(Math.max(position.x, VIEWPORT_PADDING), window.innerWidth - ROBOT_SIZE - VIEWPORT_PADDING),
        y: Math.min(Math.max(position.y, VIEWPORT_PADDING), window.innerHeight - ROBOT_SIZE - VIEWPORT_PADDING),
    });

    useEffect(() => {
        setRobotPosition({
            x: window.innerWidth - ROBOT_SIZE - 24,
            y: window.innerHeight - ROBOT_SIZE - 24,
        });

        const keepPositionVisible = () => {
            setRobotPosition(current => current ? keepRobotOnScreen(current) : current);
        };

        window.addEventListener('resize', keepPositionVisible);
        return () => window.removeEventListener('resize', keepPositionVisible);
    }, []);

    useEffect(() => {
        if (isOpen) {
            window.setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const closeOnEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                launcherRef.current?.focus();
            }
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen]);

    useEffect(() => {
        scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior: 'smooth'});
    }, [messages, isTyping]);

    useEffect(() => {
        if (!isOpen || !robotPosition || !panelRef.current) return;

        const panel = panelRef.current.getBoundingClientRect();
        const left = Math.min(
            Math.max(robotPosition.x + ROBOT_SIZE - panel.width, VIEWPORT_PADDING),
            window.innerWidth - panel.width - VIEWPORT_PADDING,
        );
        const spaceAbove = robotPosition.y - panel.height - 12;
        const spaceBelow = robotPosition.y + ROBOT_SIZE + 12;
        const top = spaceAbove >= VIEWPORT_PADDING
            ? spaceAbove
            : Math.min(spaceBelow, window.innerHeight - panel.height - VIEWPORT_PADDING);

        setPanelPosition({x: left, y: Math.max(VIEWPORT_PADDING, top)});
    }, [isOpen, robotPosition]);

    useEffect(() => () => {
        if (responseTimer.current) window.clearTimeout(responseTimer.current);
    }, []);

    const resetConversation = () => {
        if (responseTimer.current) window.clearTimeout(responseTimer.current);
        setIsTyping(false);
        setDraft('');
        setMessages([{id: nextId.current++, role: 'assistant', body: t('welcome')}]);
        inputRef.current?.focus();
    };

    const addExchange = (question: string, responseKey: SuggestionKey | 'fallback') => {
        const cleanQuestion = question.trim();
        if (!cleanQuestion || isTyping) return;

        setMessages(current => [
            ...current,
            {id: nextId.current++, role: 'user', body: cleanQuestion},
        ]);
        setDraft('');
        setIsTyping(true);

        responseTimer.current = setTimeout(() => {
            setMessages(current => [
                ...current,
                {id: nextId.current++, role: 'assistant', body: t(`responses.${responseKey}`)},
            ]);
            setIsTyping(false);
        }, 650);
    };

    const submitMessage = (event: FormEvent) => {
        event.preventDefault();
        addExchange(draft, 'fallback');
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addExchange(draft, 'fallback');
        }
    };

    const handleRobotPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;

        const origin = robotPosition ?? {
            x: window.innerWidth - ROBOT_SIZE - 24,
            y: window.innerHeight - ROBOT_SIZE - 24,
        };
        dragState.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin,
            moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
    };

    const handleRobotPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const drag = dragState.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (Math.hypot(deltaX, deltaY) > 4) drag.moved = true;

        setRobotPosition(keepRobotOnScreen({
            x: drag.origin.x + deltaX,
            y: drag.origin.y + deltaY,
        }));
    };

    const handleRobotPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (dragState.current?.pointerId !== event.pointerId) return;
        suppressClick.current = dragState.current.moved;
        dragState.current = null;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const toggleChat = () => {
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        setIsOpen(open => !open);
    };

    return (
        <aside className="pointer-events-none fixed inset-0 z-50">
            <section
                ref={panelRef}
                id="shopping-assistant-panel"
                role="dialog"
                aria-label={t('name')}
                aria-hidden={!isOpen}
                inert={!isOpen}
                className={cn(
                    'pointer-events-auto fixed flex h-[min(36rem,calc(100dvh-7rem))] w-[calc(100vw-1.5rem)] origin-bottom-right flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/95 shadow-[var(--shadow-e3)] backdrop-blur-xl transition duration-200 sm:w-[24rem]',
                    isOpen
                        ? 'translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none translate-y-4 scale-95 opacity-0'
                )}
                style={panelPosition
                    ? {left: panelPosition.x, top: panelPosition.y}
                    : {right: VIEWPORT_PADDING, bottom: ROBOT_SIZE + 28}}
            >
                <header className="relative overflow-hidden border-b border-white/15 bg-primary px-4 py-3.5 text-primary-foreground">
                    <div aria-hidden="true" className="absolute -right-8 -top-12 size-32 rounded-full border border-white/15" />
                    <div className="relative flex items-center gap-3">
                        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner">
                            <Bot className="size-5" />
                            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-primary bg-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate font-bold tracking-tight">{t('name')}</h2>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-primary-foreground/75">
                                <span className="size-1.5 rounded-full bg-emerald-300" />
                                {t('status')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={resetConversation}
                            aria-label={t('newConversation')}
                            title={t('newConversation')}
                            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground dark:hover:bg-white/15"
                        >
                            <Plus className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setIsOpen(false)}
                            aria-label={t('close')}
                            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground dark:hover:bg-white/15"
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </header>

                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                    <div className="space-y-4" aria-live="polite">
                        {messages.map(message => (
                            <div
                                key={message.id}
                                className={cn('flex items-end gap-2', message.role === 'user' && 'justify-end')}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Sparkles className="size-3.5" />
                                    </div>
                                )}
                                <p
                                    className={cn(
                                        'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                                        message.role === 'assistant'
                                            ? 'rounded-bl-md border border-border/70 bg-muted/65 text-foreground'
                                            : 'rounded-br-md bg-primary text-primary-foreground'
                                    )}
                                >
                                    {message.body}
                                </p>
                            </div>
                        ))}

                        {messages.length === 1 && (
                            <div className="pl-9 pt-1">
                                <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    {t('suggestionLabel')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestionKeys.map(key => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => addExchange(t(`suggestions.${key}`), key)}
                                            className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {t(`suggestions.${key}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isTyping && (
                            <div className="flex items-end gap-2" role="status" aria-label={t('typing')}>
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Sparkles className="size-3.5" />
                                </div>
                                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-4 py-3.5">
                                    {[0, 1, 2].map(index => (
                                        <span
                                            key={index}
                                            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                                            style={{animationDelay: `${index * 120}ms`}}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={submitMessage} className="border-t border-border/70 bg-background/75 p-3 backdrop-blur">
                    <div className="flex items-end gap-2 rounded-2xl border border-input bg-card px-3 py-2 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
                        <textarea
                            ref={inputRef}
                            value={draft}
                            onChange={event => setDraft(event.target.value)}
                            onKeyDown={handleInputKeyDown}
                            rows={1}
                            maxLength={500}
                            placeholder={t('placeholder')}
                            aria-label={t('placeholder')}
                            className="max-h-24 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
                        />
                        <Button
                            type="submit"
                            size="icon-sm"
                            disabled={!draft.trim() || isTyping}
                            aria-label={t('send')}
                            className="mb-0.5 rounded-xl"
                        >
                            <Send className="size-4" />
                        </Button>
                    </div>
                    <p className="mt-2 text-center text-[0.625rem] text-muted-foreground">{t('disclaimer')}</p>
                </form>
            </section>

            <div
                className="group/robot pointer-events-auto fixed size-20"
                style={robotPosition
                    ? {left: robotPosition.x, top: robotPosition.y}
                    : {right: 24, bottom: 24}}
            >
                <span
                    className={cn(
                        'pointer-events-none absolute top-1/2 z-20 w-max max-w-48 -translate-y-1/2 rounded-2xl border border-primary/20 bg-card/95 px-3 py-2 text-xs font-medium leading-snug text-foreground shadow-lg backdrop-blur transition-all',
                        (robotPosition?.x ?? 1000) < 220
                            ? 'left-[calc(100%+0.5rem)] rounded-bl-md'
                            : 'right-[calc(100%+0.5rem)] rounded-br-md',
                        isOpen || isDragging ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                    )}
                >
                    {dragHint}
                </span>
                <button
                    ref={launcherRef}
                    type="button"
                    onClick={toggleChat}
                    onPointerDown={handleRobotPointerDown}
                    onPointerMove={handleRobotPointerMove}
                    onPointerUp={handleRobotPointerUp}
                    onPointerCancel={handleRobotPointerUp}
                    aria-label={isOpen ? t('close') : t('open')}
                    aria-expanded={isOpen}
                    aria-controls="shopping-assistant-panel"
                    className={cn(
                        'group/robot relative size-20 touch-none select-none rounded-[1.5rem] outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50',
                        isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105'
                    )}
                >
                    <span className={cn('absolute inset-0', !isDragging && 'animate-robot-hover')}>
                        <span className="absolute bottom-0 left-1/2 h-3 w-14 -translate-x-1/2 rounded-full bg-foreground/15 blur-sm" />

                        <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 bg-primary/60" />
                        <span className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 -translate-y-1 rounded-full border-2 border-background bg-cyan-400 shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_70%,transparent)]" />

                        <span className="absolute left-1 top-7 size-3.5 rounded-full border-2 border-primary/40 bg-secondary" />
                        <span className="absolute right-1 top-7 size-3.5 rounded-full border-2 border-primary/40 bg-secondary" />

                        <span className="absolute left-1/2 top-2.5 h-10 w-15 -translate-x-1/2 rounded-[1.15rem] border-2 border-primary/35 bg-gradient-to-br from-white via-blue-50 to-blue-200 shadow-[0_8px_22px_-8px_color-mix(in_oklch,var(--color-primary)_70%,transparent)] dark:from-slate-100 dark:via-blue-200 dark:to-blue-400">
                            <span className="absolute inset-x-2 top-2 h-5 rounded-[0.65rem] bg-slate-800 shadow-inner">
                                <span className="absolute left-2 top-1.5 size-2 rounded-full bg-cyan-300 shadow-[0_0_7px_#67e8f9] transition-transform group-hover/robot:scale-y-50" />
                                <span className="absolute right-2 top-1.5 size-2 rounded-full bg-cyan-300 shadow-[0_0_7px_#67e8f9] transition-transform group-hover/robot:scale-y-50" />
                                <span className="absolute bottom-1 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-b-full border-b-2 border-cyan-200" />
                            </span>
                        </span>

                        <span className="absolute left-1/2 top-11 h-6 w-10 -translate-x-1/2 rounded-b-2xl rounded-t-lg border-2 border-primary/30 bg-gradient-to-b from-blue-100 to-blue-300 shadow-md dark:from-blue-200 dark:to-blue-500">
                            <Heart className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 fill-primary text-primary" />
                        </span>
                        <span className="absolute left-3.5 top-12 h-2 w-5 -rotate-[28deg] rounded-full bg-blue-200 dark:bg-blue-400" />
                        <span className="absolute right-3.5 top-12 h-2 w-5 rotate-[28deg] rounded-full bg-blue-200 dark:bg-blue-400" />
                        <span className="absolute bottom-1.5 left-7 h-2.5 w-2 rounded-b-full bg-primary/60" />
                        <span className="absolute bottom-1.5 right-7 h-2.5 w-2 rounded-b-full bg-primary/60" />

                        {!isOpen && <span className="absolute right-1 top-1 size-3.5 rounded-full border-2 border-background bg-emerald-400 shadow-sm" />}
                    </span>
                </button>
            </div>
        </aside>
    );
}
