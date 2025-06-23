"use client";
import React, { useState, ChangeEvent, DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// 颜色调色板，可根据需要增减
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#387908', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function Dashboard() {
  const [files, setFiles] = useState<File[]>([]);
  const [aliases, setAliases] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleBrowse = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };
  const updateAlias = (idx: number, name: string) => setAliases(prev => ({ ...prev, [idx]: name }));
  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setAliases(prev => { const next = { ...prev }; delete next[idx]; return next; });
  };

  const startAnalysis = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      const resp = await fetch('http://localhost:8000/api/analyze', { method: 'POST', body: form });
      const data = await resp.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildTrendData = (type: 'cashValueTrend' | 'irrTrend') => {
    const chartData: any[] = [];
    results.forEach(r => {
      const name = r['产品名称'];
      const series = type === 'cashValueTrend'
        ? r['利益演示表'].map((row: any) => ({ year: `第${row.year}年`, [name]: row.cash_value }))
        : r.irrTrend.map((val: number, i: number) => ({ year: `第${i + 1}年`, [name]: val }));
      series.forEach(point => {
        const entry = chartData.find(d => d.year === point.year);
        if (entry) Object.assign(entry, point);
        else chartData.push(point);
      });
    });
    return chartData;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col">
      <header className="bg-white/90 backdrop-blur sticky top-0 z-20 shadow-md px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-700">京保保-智能保险计划分析助手</h1>
          <p className="text-gray-600">多文件上传 · AI核心指标提取 · 可视化对比</p>
        </div>
        <Button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-shadow">
          开始新分析
        </Button>
      </header>
      <main className="flex-1 p-8 grid grid-cols-3 gap-8 overflow-auto">
        <section className="col-span-1 space-y-6">
          <Card className="shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
            <CardHeader><h2 className="text-xl font-semibold">上传计划书文件</h2></CardHeader>
            <CardContent onDrop={handleDrop} onDragOver={handleDragOver} className="py-16 border-2 border-dashed rounded-xl text-center hover:border-indigo-400 transition-colors">
              <UploadCloud className="w-12 h-12 mx-auto text-indigo-400 mb-3" />
              <p>拖拽文件或{' '}<label className="text-indigo-500 underline cursor-pointer"><input type="file" multiple hidden onChange={handleBrowse}/>浏览</label></p>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
            <CardHeader><h2 className="text-xl font-semibold">已选文件</h2></CardHeader>
            <CardContent className="space-y-4">
              {files.length===0 ? (
                <p className="text-gray-500">暂无文件</p>
              ) : (
                files.map((f, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <input className="flex-1 border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300" value={aliases[i] ?? f.name} onChange={e => updateAlias(i, e.target.value)} />
                    <button className="text-red-500 hover:text-red-700" onClick={() => removeFile(i)}>删除</button>
                  </div>
                ))
              )}
              <Button onClick={startAnalysis} className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-xl shadow hover:shadow-lg transition-shadow">
                {loading ? '分析中...' : '开始分析'}
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
            <CardHeader><h2 className="text-xl font-semibold">方案文字总结</h2></CardHeader>
            <CardContent style={{ height: 300 }} className="overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-400 text-center py-8">暂无文字总结，点击 "开始分析" 生成后查看</p>
              ) : (
                results.map((r, idx) => (
                  <div key={idx} className="mb-4">
                    <h3 className="text-lg font-medium text-indigo-700 mb-1 truncate">{r['产品名称']}</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{r.summary}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
        <section className="col-span-2 space-y-6">
          <Card className="shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
            <CardHeader><h2 className="text-xl font-semibold">核心指标对比</h2></CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-gray-400 text-center py-8">暂无数据</p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2">产品名称</th>
                      <th className="p-2">保多少</th>
                      <th className="p-2">保多久</th>
                      <th className="p-2">首年交多少</th>
                      <th className="p-2">交多久</th>
                      <th className="p-2">总缴费</th>
                      <th className="p-2">回本期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-2 truncate">{r['产品名称']}</td>
                        <td className="p-2">{r['保多少']}</td>
                        <td className="p-2">{r['保多久']}</td>
                        <td className="p-2">{r['首年交多少']}</td>
                        <td className="p-2">{r['交多久']}</td>
                        <td className="p-2">{(r['首年交多少'] || 0) * (r['交多久'] || 0)}</td>
                        <td className="p-2">{r.computedPayback ? `第${r.computedPayback}年` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
            <CardHeader><h2 className="text-xl font-semibold">现金价值趋势图</h2></CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={buildTrendData('cashValueTrend')} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {results.map((r, idx) => (
                    <Line key={r['产品名称']} type="monotone" dataKey={r['产品名称']} stroke={COLORS[idx % COLORS.length]} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-2xl transition-shadow hover:shadow-xl">
            <CardHeader><h2 className="text-xl font-semibold">IRR 趋势图</h2></CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={buildTrendData('irrTrend')} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Legend />
                  {results.map((r, idx) => (
                    <Line key={r['产品名称']} type="monotone" dataKey={r['产品名称']} stroke={COLORS[idx % COLORS.length]} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}


// "use client";
// import React, { useState, ChangeEvent, DragEvent } from 'react';
// import { UploadCloud } from 'lucide-react';
// import { Card, CardHeader, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import {
//   ResponsiveContainer,
//   LineChart, Line,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend
// } from 'recharts';

// // 颜色调色板，可根据需要增减
// const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#387908', '#8dd1e1', '#a4de6c', '#d0ed57'];

// export default function Dashboard() {
//   const [files, setFiles] = useState<File[]>([]);
//   const [aliases, setAliases] = useState<{ [key: number]: string }>({});
//   const [loading, setLoading] = useState(false);
//   const [results, setResults] = useState<any[]>([]);

//   const handleDrop = (e: DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
//   };
//   const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
//   const handleBrowse = (e: ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
//   };
//   const updateAlias = (idx: number, name: string) => setAliases(prev => ({ ...prev, [idx]: name }));
//   const removeFile = (idx: number) => {
//     setFiles(prev => prev.filter((_, i) => i !== idx));
//     setAliases(prev => { const next = { ...prev }; delete next[idx]; return next; });
//   };

//   const startAnalysis = async () => {
//     if (!files.length) return;
//     setLoading(true);
//     try {
//       const form = new FormData();
//       files.forEach(f => form.append('files', f));
//       const resp = await fetch('http://localhost:8000/api/analyze', { method: 'POST', body: form });
//       const data = await resp.json();
//       setResults(data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const buildTrendData = (type: 'cashValueTrend' | 'irrTrend') => {
//     const chartData: any[] = [];
//     results.forEach(r => {
//       const name = r['产品名称'];
//       const series = type === 'cashValueTrend'
//         ? r['利益演示表'].map((row: any) => ({ year: `第${row.year}年`, [name]: row.cash_value }))
//         : r.irrTrend.map((val: number, i: number) => ({ year: `第${i + 1}年`, [name]: val }));
//       series.forEach(point => {
//         const entry = chartData.find(d => d.year === point.year);
//         if (entry) Object.assign(entry, point);
//         else chartData.push(point);
//       });
//     });
//     return chartData;
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col">
//       <header className="bg-white/80 backdrop-blur sticky top-0 z-20 shadow px-8 py-4 flex justify-between items-center">
//         <div>
//           <h1 className="text-3xl font-extrabold text-indigo-700">京保保-智能保险计划分析助手</h1>
//           <p className="text-gray-600">多文件上传 · AI核心指标提取 · 可视化对比</p>
//         </div>
//         <Button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
//           开始新分析
//         </Button>
//       </header>
//       <main className="flex-1 p-8 grid grid-cols-3 gap-6 overflow-auto">
//         <section className="col-span-1 space-y-6">
//           <Card>
//             <CardHeader><h2 className="text-xl font-semibold">上传计划书文件</h2></CardHeader>
//             <CardContent onDrop={handleDrop} onDragOver={handleDragOver} className="py-16 border-2 border-dashed rounded-lg text-center hover:border-indigo-400">
//               <UploadCloud className="w-12 h-12 mx-auto text-indigo-400 mb-3" />
//               <p>拖拽文件或{' '}<label className="text-indigo-500 underline cursor-pointer"><input type="file" multiple hidden onChange={handleBrowse}/>浏览</label></p>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader><h2 className="text-xl font-semibold">已选文件</h2></CardHeader>
//             <CardContent className="space-y-4">
//               {files.length===0?
//                 <p className="text-gray-500">暂无文件</p>:
//                 files.map((f,i)=>(
//                   <div key={i} className="flex items-center space-x-2">
//                     <input className="flex-1 border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-300" value={aliases[i]??f.name} onChange={e=>updateAlias(i,e.target.value)}/>
//                     <button className="text-red-500 hover:text-red-700" onClick={()=>removeFile(i)}>删除</button>
//                   </div>
//                 ))}
//               <Button onClick={startAnalysis} className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg">
//                 {loading?'分析中...':'开始分析'}
//               </Button>
//             </CardContent>
//           </Card>
//           {results.length>0&&(
//             <Card>
//               <CardHeader><h2 className="text-xl font-semibold">方案文字总结</h2></CardHeader>
//               <CardContent style={{height:300}} className="overflow-y-auto">
//                 {results.map((r,idx)=>(
//                   <div key={idx} className="mb-4">
//                     <h3 className="text-lg font-medium text-indigo-700 mb-1 truncate">{r['产品名称']}</h3>
//                     <p className="text-gray-700 whitespace-pre-wrap">{r.summary}</p>
//                   </div>
//                 ))}
//               </CardContent>
//             </Card>
//           )}
//         </section>
//         <section className="col-span-2 space-y-6">
//           <Card>
//             <CardHeader><h2 className="text-xl font-semibold">核心指标对比</h2></CardHeader>
//             <CardContent>
//               {results.length===0?
//                 <p className="text-gray-400 text-center py-8">暂无数据</p>:
//                 <table className="w-full border-collapse text-left">
//                   <thead><tr className="bg-gray-100">
//                     <th className="p-2">产品名称</th><th className="p-2">保多少</th><th className="p-2">保多久</th>
//                     <th className="p-2">首年交多少</th><th className="p-2">交多久</th><th className="p-2">总缴费</th><th className="p-2">回本期</th>
//                   </tr></thead>
//                   <tbody>{results.map((r,i)=>(
//                     <tr key={i} className="border-t hover:bg-gray-50">
//                       <td className="p-2 truncate">{r['产品名称']}</td>
//                       <td className="p-2">{r['保多少']}</td>
//                       <td className="p-2">{r['保多久']}</td>
//                       <td className="p-2">{r['首年交多少']}</td>
//                       <td className="p-2">{r['交多久']}</td>
//                       <td className="p-2">{(r['首年交多少']||0)*(r['交多久']||0)}</td>
//                       <td className="p-2">{r.computedPayback?`第${r.computedPayback}年`:'--'}</td>
//                     </tr>
//                   ))}</tbody>
//                 </table>
//               }
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader><h2 className="text-xl font-semibold">现金价值趋势图</h2></CardHeader>
//             <CardContent style={{height:300}}>
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={buildTrendData('cashValueTrend')} margin={{top:5,right:30,left:20,bottom:5}}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="year" />
//                   <YAxis />
//                   <Tooltip />
//                   <Legend />
//                   {results.map((r,idx)=>(<Line key={r['产品名称']} type="monotone" dataKey={r['产品名称']} stroke={COLORS[idx%COLORS.length]} dot={false}/>))}
//                 </LineChart>
//               </ResponsiveContainer>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader><h2 className="text-xl font-semibold">IRR 趋势图</h2></CardHeader>
//             <CardContent style={{height:300}}>
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={buildTrendData('irrTrend')} margin={{top:5,right:30,left:20,bottom:5}}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="year" />
//                   <YAxis unit="%" />
//                   <Tooltip />
//                   <Legend />
//                   {results.map((r,idx)=>(<Line key={r['产品名称']} type="monotone" dataKey={r['产品名称']} stroke={COLORS[idx%COLORS.length]} dot={false}/>))}
//                 </LineChart>
//               </ResponsiveContainer>
//             </CardContent>
//           </Card>
//         </section>
//       </main>
//     </div>
//   );
// }

