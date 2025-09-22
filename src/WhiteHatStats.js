import React, {useEffect, useRef,useMemo} from 'react';
import useSVGCanvas from './useSVGCanvas.js';
import * as d3 from 'd3';

//change the code below to modify the bottom plot view
export default function WhiteHatStats(props){
    //this is a generic component for plotting a d3 plot
    const d3Container = useRef(null);
    //this automatically constructs an svg canvas the size of the parent container (height and width)
    //tTip automatically attaches a div of the class 'tooltip' if it doesn't already exist
    //this will automatically resize when the window changes so passing svg to a useeffect will re-trigger
    const [svg, height, width, tTip] = useSVGCanvas(d3Container);

    const margin = { top: 56, right: 24, bottom: 30, left: 120 };

    //TODO: modify or replace the code below to draw a more truthful or insightful representation of the dataset. This other representation could be a histogram, a stacked bar chart, etc.
    //this loop updates when the props.data changes or the window resizes
    //we can edit it to also use props.brushedState if you want to use linking
    useEffect(()=>{
        //wait until the data loads
        if(svg === undefined | props.data === undefined){ return }

        svg.selectAll('*').remove();

        const innerW = Math.max(10, width  - margin.left - margin.right);
        const innerH = Math.max(10, height - margin.top  - margin.bottom);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        //aggregate gun deaths by state
        const data = props.data.states;
        //get data for each state
        const plotData = [];
        for(let state of data){
            const dd = drawingDifficulty[state.abreviation];
            let entry = {
                'total': state.count,
                'male': Number(((state.male_count / Number(state.population)) * 100000).toFixed(2)),
                'female': Number((((state.count - state.male_count) / Number(state.population)) * 100000).toFixed(2)),
                'population': Number(state.population),
                'per100k': Number(((state.count / Number(state.population)) * 100000).toFixed(2)),
                'name': state.state.replaceAll("_", " "),
                'easeOfDrawing': dd === undefined? 5: dd,
                'genderRatio': state.male_count/state.count,
            }
            plotData.push(entry)
        }


        plotData.sort((a,b) => d3.descending(a.per100k, b.per100k));
        console.log(plotData)
       
        const xMax = d3.max(plotData, d => d.per100k);
        const xScale = d3.scaleLinear()
            .domain([0, xMax])
            .range([0, innerW]);

        const yScale = d3.scaleBand()
            .domain(plotData.map(d => d.name))
            .range([0, innerH])
            .padding(0.15);

        const color = d3.scaleOrdinal()
            .domain(['male','female'])
            .range(['#3182bd', '#e6550d']);

        const stacked = d3.stack()
            .keys(['male','female'])
            .value((d, key) => d[key])(plotData);

        const layers = g.selectAll('.layer')
            .data(stacked)
            .enter()
            .append('g')
            .attr('class', 'layer')
            .attr('fill', d => color(d.key));

        layers.selectAll('rect')
            .data(d => d.map(v => ({ key: d.key, data: v.data, x0: v[0], x1: v[1] })))
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.x0))
            .attr('y', d => yScale(d.data.name))
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.x1) - xScale(d.x0))
            .on('mouseover', (e,d)=>{
                const share = d.data.per100k > 0 ? ((d.data[d.key] / d.data.per100k) * 100) : 0;
                const lines = [
                    `<b>${d.data.name}</b>`,
                    `Total deaths: ${d.data.total}`,
                    `${d.key === 'male' ? 'Male' : 'Female'}: ${d.data[d.key]} (${share.toFixed(1)}%)`,
                    `Total Per 100k: ${d.data.per100k.toFixed(2)}`
                ].filter(Boolean);
                props.ToolTip.moveTTipEvent(tTip,e);
                tTip.html(lines.join('</br>'));
            })
            .on('mousemove', (e)=> props.ToolTip.moveTTipEvent(tTip,e))
            .on('mouseout', ()=> props.ToolTip.hideTTip(tTip));


        g.append('g').attr('class','x-axis')
            .call(d3.axisTop(xScale).ticks(6).tickSizeOuter(0));
        g.append('g').attr('class','y-axis')
            .call(d3.axisLeft(yScale).tickSizeOuter(0));

        svg.append('text')
            .attr('x', margin.left + innerW/2)
            .attr('y', Math.max(20, margin.top - 34))
            .attr('text-anchor','middle')
            .attr('font-size', Math.min(18, Math.max(12, width*0.02)))
            .attr('font-weight','bold')
            .text('Gun Deaths by State (Per 100k)');

        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top - 34})`);

        const legendItems = [
            { key: 'male',   label: 'Male',   color: color('male') },
            { key: 'female', label: 'Female', color: color('female') },
        ];

        const li = legend.selectAll('.lg')
            .data(legendItems)
            .enter().append('g')
            .attr('class','lg')
            .attr('transform', (d,i)=> `translate(${i*120},0)`);
        li.append('rect')
            .attr('x',0).attr('y',-12)
            .attr('width',14).attr('height',14)
            .attr('fill', d=>d.color);
        li.append('text')
            .attr('x',20).attr('y',-3)
            .attr('dominant-baseline','middle')
            .attr('font-size',12)
            .text(d=>d.label);

        const brushed = props.brushedState;
        if (brushed){
            const brushedName = brushed.replace(/_/g,' ');
            if (yScale.domain().includes(brushedName)) {
                g.append('rect')
                    .attr('x',0)
                    .attr('y', yScale(brushedName))
                    .attr('width', xScale(xMax))
                    .attr('height', yScale.bandwidth())
                    .attr('fill','none')
                    .attr('stroke','#222')
                    .attr('stroke-width',2)
                    .attr('pointer-events','none');
            }
        }
    },[props.data, svg, height, width, props.brushedState]);

    return (
        <div
            className={"d3-component"}
            style={{'height':'99%','width':'99%'}}
            ref={d3Container}
        ></div>
    );
}
//END of TODO #1.

 
const drawingDifficulty = {
    'IL': 9,
    'AL': 2,
    'AK': 1,
    'AR': 3,
    'CA': 9.51,
    'CO': 0,
    'DE': 3.1,
    'DC': 1.3,
    'FL': 8.9,
    'GA': 3.9,
    'HI': 4.5,
    'ID': 4,
    'IN': 4.3,
    'IA': 4.1,
    'KS': 1.6,
    'KY': 7,
    'LA': 6.5,
    'MN': 2.1,
    'MO': 5.5,
    'ME': 7.44,
    'MD': 10,
    'MA': 6.8,
    'MI': 9.7,
    'MN': 5.1,
    'MS': 3.8,
    'MT': 1.4,
    'NE': 1.9,
    'NV': .5,
    'NH': 3.7,
    'NJ': 9.1,
    'NM': .2,
    'NY': 8.7,
    'NC': 8.5,
    'ND': 2.3,
    'OH': 5.8,
    'OK': 6.05,
    'OR': 4.7,
    'PA': 4.01,
    'RI': 8.4,
    'SC': 7.1,
    'SD': .9,
    'TN': 3.333333,
    'TX': 8.1,
    'UT': 2.8,
    'VT': 2.6,
    'VA': 8.2,
    'WA': 9.2,
    'WV': 7.9,
    'WY': 0,
}
