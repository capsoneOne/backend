'use client';

import {Ruler} from 'lucide-react';
import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';

const GENERAL_SIZE_CHART = [
    {size: 'XS', chest: '81–86', waist: '64–69', hips: '86–91'},
    {size: 'S', chest: '86–91', waist: '69–74', hips: '91–97'},
    {size: 'M', chest: '91–97', waist: '74–81', hips: '97–102'},
    {size: 'L', chest: '97–104', waist: '81–89', hips: '102–109'},
    {size: 'XL', chest: '104–112', waist: '89–97', hips: '109–117'},
] as const;

export function SizeGuide() {
    const t = useTranslations('Product');

    return (
        <Dialog>
            <DialogTrigger render={<Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1" />}>
                <Ruler className="mr-1.5 size-4" />
                {t('sizeGuide.open')}
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t('sizeGuide.title')}</DialogTitle>
                    <DialogDescription>{t('sizeGuide.description')}</DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('sizeGuide.size')}</TableHead>
                                <TableHead>{t('sizeGuide.chest')}</TableHead>
                                <TableHead>{t('sizeGuide.waist')}</TableHead>
                                <TableHead>{t('sizeGuide.hips')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {GENERAL_SIZE_CHART.map(row => (
                                <TableRow key={row.size}>
                                    <TableCell className="font-semibold">{row.size}</TableCell>
                                    <TableCell>{row.chest}</TableCell>
                                    <TableCell>{row.waist}</TableCell>
                                    <TableCell>{row.hips}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="grid gap-4 rounded-xl bg-muted/60 p-5 sm:grid-cols-3">
                    <div>
                        <p className="font-semibold">{t('sizeGuide.measureChest')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t('sizeGuide.measureChestHelp')}</p>
                    </div>
                    <div>
                        <p className="font-semibold">{t('sizeGuide.measureWaist')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t('sizeGuide.measureWaistHelp')}</p>
                    </div>
                    <div>
                        <p className="font-semibold">{t('sizeGuide.measureHips')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t('sizeGuide.measureHipsHelp')}</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('sizeGuide.disclaimer')}</p>
            </DialogContent>
        </Dialog>
    );
}
