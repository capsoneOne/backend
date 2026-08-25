import {LanguageCode} from '@vendure/core';

export interface KnowledgeDocument {
    id: string;
    title: string;
    path: string;
    content: string;
}

const en: KnowledgeDocument[] = [
    {
        id: 'delivery',
        title: 'Delivery options',
        path: '/shipping-returns',
        content: 'Standard delivery takes 5–7 business days. Express takes 2–3 business days. Next-day delivery is available only in selected areas and appears at checkout when the address qualifies. Exact options and costs are shown before payment.',
    },
    {
        id: 'free-shipping',
        title: 'Free shipping',
        path: '/shipping-returns',
        content: 'Standard delivery is free for orders over $50 after discounts and before tax. Checkout is authoritative for the final shipping charge.',
    },
    {
        id: 'returns',
        title: 'Returns',
        path: '/shipping-returns',
        content: 'Eligible items may be returned within 30 days of delivery if unused and in their original packaging. Contact the store with the order code to receive a prepaid label. Refunds go to the original payment method after inspection. Personalised items and opened hygiene-sealed items are excluded unless faulty.',
    },
    {
        id: 'tracking',
        title: 'Order tracking',
        path: '/help',
        content: 'A tracking number is emailed after dispatch. Signed-in customers can also view an order status in account order history.',
    },
    {
        id: 'demo-store',
        title: 'About this store',
        path: '/about',
        content: 'Lumé is a student capstone project, not a live retailer. Checkout uses ABA PayWay and should remain in PayWay sandbox mode. No physical goods are shipped, and products, prices, stock and delivery estimates are sample data.',
    },
];

const km: KnowledgeDocument[] = [
    {
        id: 'delivery',
        title: 'ជម្រើសដឹកជញ្ជូន',
        path: '/shipping-returns',
        content: 'ការដឹកជញ្ជូនស្តង់ដារចំណាយពេល 5–7 ថ្ងៃធ្វើការ។ រហ័សចំណាយពេល 2–3 ថ្ងៃ។ ការដឹកថ្ងៃបន្ទាប់មានតែតំបន់មួយចំនួន ហើយបង្ហាញនៅពេលទូទាត់បើអាសយដ្ឋានអាចប្រើបាន។',
    },
    {
        id: 'free-shipping',
        title: 'ការដឹកជញ្ជូនឥតគិតថ្លៃ',
        path: '/shipping-returns',
        content: 'ការដឹកជញ្ជូនស្តង់ដារឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញលើសពី $50 បន្ទាប់ពីបញ្ចុះតម្លៃ និងមុនពន្ធ។ តម្លៃនៅពេលទូទាត់គឺជាតម្លៃចុងក្រោយ។',
    },
    {
        id: 'returns',
        title: 'ការត្រឡប់ទំនិញ',
        path: '/shipping-returns',
        content: 'ទំនិញអាចត្រឡប់ក្នុង 30 ថ្ងៃបន្ទាប់ពីដឹកដល់ បើមិនទាន់ប្រើ និងនៅក្នុងវេចខ្ចប់ដើម។ ទាក់ទងហាងជាមួយលេខបញ្ជាទិញ ដើម្បីទទួលស្លាកបង់ថ្លៃរួច។ ទំនិញកែផ្ទាល់ខ្លួន និងទំនិញអនាម័យដែលបានបើកមិនអាចត្រឡប់បាន លុះត្រាតែខូច។',
    },
    {
        id: 'tracking',
        title: 'តាមដានការបញ្ជាទិញ',
        path: '/help',
        content: 'លេខតាមដាននឹងផ្ញើតាមអ៊ីមែលបន្ទាប់ពីផ្ញើទំនិញ។ អតិថិជនដែលចូលគណនីអាចមើលស្ថានភាពក្នុងប្រវត្តិការបញ្ជាទិញ។',
    },
    {
        id: 'demo-store',
        title: 'អំពីហាងនេះ',
        path: '/about',
        content: 'Lumé ជាគម្រោងបញ្ចប់ការសិក្សា មិនមែនជាហាងពិតទេ។ ការទូទាត់ប្រើ ABA PayWay ហើយគួរប្រើរបៀប sandbox។ មិនមានការផ្ញើទំនិញពិតទេ។',
    },
];

export function getKnowledgeDocuments(languageCode: LanguageCode): KnowledgeDocument[] {
    return languageCode === LanguageCode.km ? km : en;
}
