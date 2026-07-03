import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || '';
    const location = searchParams.get('location') || '';
    const page = searchParams.get('page') || '1';

    const joobleKey = searchParams.get('jooble_key') || process.env.JOOBLE_KEY || '';

    if (joobleKey) {
      const joobleRes = await fetch(`https://jooble.org/api/v2/jobs/${joobleKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: category || 'software developer',
          location: location || 'Remote',
          page: page
        })
      });

      if (joobleRes.ok) {
        const joobleData = await joobleRes.json();
        const results = (joobleData.jobs || []).map((item: any) => {
          const desc = item.snippet || '';
          const techStack: string[] = [];
          const keywords = [
            'React', 'TypeScript', 'Next.js', 'Tailwind', 'JavaScript', 'Node.js', 'Python', 'SQL',
            'Sales', 'Marketing', 'CRM', 'Excel', 'RN', 'ACLS', 'BLS', 'Patient Care', 'SaaS', 'Finance'
          ];
          keywords.forEach(k => {
            if (new RegExp(`\\b${k}\\b`, 'i').test(desc)) {
              techStack.push(k);
            }
          });

          return {
            id: `jooble-${item.id}`,
            title: item.title || 'Job Opening',
            company: item.company || 'Company',
            location: item.location || 'Remote',
            salary: item.salary || '$90,000 - $120,000 (Estimated)',
            remote: item.location?.toLowerCase().includes('remote') ? 'remote' : 'hybrid',
            jobType: 'fulltime',
            description: desc.replace(/<[^>]*>/g, '').slice(0, 500) + '...',
            techStack: techStack.length > 0 ? techStack : ['Communication', 'Teamwork'],
            industry: category || 'General',
            url: item.link || '',
            createdAt: Date.now()
          };
        });
        return NextResponse.json({ results });
      }
    }

    // Fallback: The Muse API
    let museCategory = '';
    const catLower = category.toLowerCase();
    if (catLower.includes('tech') || catLower.includes('software') || catLower.includes('dev')) {
      museCategory = 'Software Engineering';
    } else if (catLower.includes('health') || catLower.includes('nurse') || catLower.includes('medical')) {
      museCategory = 'Healthcare';
    } else if (catLower.includes('sales') || catLower.includes('business dev')) {
      museCategory = 'Sales';
    } else if (catLower.includes('finance') || catLower.includes('analyst') || catLower.includes('accounting')) {
      museCategory = 'Accounting and Finance';
    } else if (catLower.includes('marketing') || catLower.includes('social media')) {
      museCategory = 'Marketing';
    }

    let url = `https://www.themuse.com/api/public/jobs?page=${page}`;
    if (museCategory) {
      url += `&category=${encodeURIComponent(museCategory)}`;
    }
    if (location) {
      url += `&location=${encodeURIComponent(location)}`;
    }

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`The Muse API returned status ${res.status}`);
    }

    const data = await res.json();
    
    // Transform Muse results to our Job interface
    const results = (data.results || []).map((item: any) => {
      // Find clean tech stack/requirements tags based on description
      const desc = item.contents || '';
      const techStack: string[] = [];
      const keywords = [
        'React', 'TypeScript', 'Next.js', 'Tailwind', 'JavaScript', 'Node.js', 'Python', 'SQL',
        'Sales', 'Marketing', 'CRM', 'Excel', 'RN', 'ACLS', 'BLS', 'Patient Care', 'SaaS', 'Finance'
      ];
      keywords.forEach(k => {
        if (new RegExp(`\\b${k}\\b`, 'i').test(desc)) {
          techStack.push(k);
        }
      });

      return {
        id: `muse-${item.id}`,
        title: item.name || 'Job Opening',
        company: item.company?.name || 'Company',
        location: item.locations?.[0]?.name || 'Remote',
        salary: '$90,000 - $120,000 (Estimated)', // Muse API doesn't always provide salary data
        remote: item.locations?.[0]?.name?.toLowerCase().includes('remote') ? 'remote' : 'hybrid',
        jobType: 'fulltime',
        description: desc.replace(/<[^>]*>/g, '').slice(0, 500) + '...',
        techStack: techStack.length > 0 ? techStack : ['Communication', 'Teamwork'],
        industry: category || 'General',
        url: item.refs?.landing_page || '',
        createdAt: Date.now()
      };
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Jobs API Router error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
