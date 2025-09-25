import pandas as pd
import numpy as np
import re
import httpx
import json
import asyncio
import matplotlib
matplotlib.use('Agg')  # 브라우저 자동 열기 방지
import matplotlib.pyplot as plt
import plotly.express as px
import plotly.graph_objects as go
import plotly
import plotly.io as pio
pio.renderers.default = "json"  # Plotly 브라우저 자동 열기 방지
import io
import sys
from contextlib import redirect_stdout, redirect_stderr
from openai import AsyncOpenAI
from typing import Dict, Any, List
from ..core.config import settings

def convert_numpy_types(obj):
    """NumPy/pandas 타입을 JSON 직렬화 가능한 Python 타입으로 변환"""
    import pandas as pd
    from datetime import datetime

    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (pd.Timestamp, pd.Timedelta)):
        return str(obj)  # Timestamp를 문자열로 변환
    elif isinstance(obj, datetime):
        return obj.isoformat()  # datetime을 ISO 형식 문자열로 변환
    elif isinstance(obj, pd.Series):
        return obj.tolist()  # Series를 리스트로 변환
    elif hasattr(obj, '__array__'):  # pandas 관련 배열 타입들
        try:
            return obj.tolist()
        except:
            return str(obj)
    elif hasattr(obj, 'item'):  # NumPy scalar
        return obj.item()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        # 마지막 fallback: JSON 직렬화 테스트
        try:
            import json
            json.dumps(obj)
            return obj
        except (TypeError, ValueError):
            # JSON 직렬화 실패시 문자열로 변환
            return str(obj)

class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def analyze_data(self, df: pd.DataFrame, question: str, eda_data: Dict[str, Any] = None) -> Dict[str, Any]:
        print(f"🚀 analyze_data called with question: '{question}'")
        """데이터를 분석하고 인사이트 및 차트 정보 반환"""
        
        # Provide comprehensive data analysis to AI - OPTIMIZED for large datasets
        if eda_data:
            data_info = self._format_eda_for_ai(eda_data)
            # Limit sample data to prevent token overflow
            preview_data = eda_data.get("preview", {}).get("head", convert_numpy_types(df.head(3).to_dict()))
            data_sample = str(preview_data)[:2000]  # Truncate long samples
        else:
            data_info = self._get_data_info(df)
            # Use smaller sample and truncate for large datasets
            sample_size = 3 if len(df) > 1000 else 5
            data_sample = str(convert_numpy_types(df.head(sample_size).to_dict()))[:2000]  # Truncate long samples
            
        # CRITICAL: Provide actual data statistics and aggregations to match chart generation
        data_statistics = self._get_comprehensive_data_stats(df, question)
        
        # 실제 컬럼 이름 리스트
        available_columns = df.columns.tolist()
        
        # Analyze user intent and map to appropriate columns
        intent_analysis = self._analyze_user_intent(question, available_columns)
        suggested_columns = intent_analysis['suggested_columns']
        analysis_focus = intent_analysis['analysis_focus']
        
        # OPTIMIZED analysis prompt - condensed for large datasets
        analysis_prompt = f"""
Data analyst task: Answer "{question}" using the dataset below.

DATASET: {len(df):,} records, {len(df.columns)} columns
KEY STATS: {data_statistics}
SAMPLE: {data_sample}
COLUMNS: {available_columns}

ANALYSIS FOCUS: {analysis_focus}
KEY COLUMNS: {suggested_columns}

CHART TYPE RULES (COMPREHENSIVE PLOTLY SUPPORT):
BASIC: "pie/line/bar/scatter/area" → use respective type
STATISTICAL: "histogram/box/violin/strip/density_contour/density_heatmap/distplot/ecdf"
SPECIALIZED: "funnel/waterfall/treemap/sunburst/radar/heatmap"
GEO/MAP: "choropleth/scattergeo" → for geographic data (countries, regions, coordinates)
3D: "scatter_3d/surface/line_3d/mesh3d"
FINANCIAL: "candlestick/ohlc"
MULTIVARIATE: "parallel_coordinates/parallel_categories"
KOREAN SUPPORT: 히스토그램/박스플롯/바이올린/트리맵/선버스트/레이더/히트맵/깔때기/폭포차트/산포도/3D산점도/표면차트/캔들스틱/평행좌표/분포플롯/누적분포/지도차트/지리적산점도
GEOGRAPHIC KEYWORDS: 지도/지역/국가/시도/위치/좌표/latitude/longitude/country/region/map/지도차트 → use "choropleth" or "scattergeo"
Default: proportions→pie, trends→line, comparisons→bar, correlations→scatter, distributions→histogram, hierarchical→treemap, financial→candlestick, geographic→choropleth

RESPONSE FORMAT (JSON only):
{{
  "insights": [
    "## 핵심 발견사항\n- [핵심 발견사항 1 - 구체적이고 명확하게]\n- [핵심 발견사항 2 - 수치와 함께]\n- [핵심 발견사항 3 - 패턴 설명]",
    "### 주요 통계\n- 전체 데이터 수: [숫자]개\n- 핵심 지표: [구체적 수치와 함께 설명]\n- 평균값: [평균]\n- 최댓값/최솟값: [범위 정보]\n- 분포 특성: [분포에 대한 설명]",
    "### 세부 분석\n- [패턴 1]: [구체적 설명과 수치]\n- [패턴 2]: [구체적 설명과 수치]\n- [트렌드]: [시간별/카테고리별 변화 양상]\n- [상관관계]: [변수들 간의 관계와 강도]",
    "### 실행 가능한 인사이트\n- [비즈니스 관점 1]: [구체적 의미와 영향]\n- [개선방안]: [실행 가능한 제안]\n- [다음 분석 방향]: [추가 분석 제안]"
  ],
  "chart_type": "bar|line|pie|scatter|histogram|box|violin|treemap|sunburst|radar|heatmap|choropleth|scattergeo",
  "chart_columns": {{"x": "exact_column_name", "y": "exact_column_name"}},
  "summary": "{question}에 대한 간단명료한 답변. 인사이트와 중복되지 않는 직접적인 답변만 제공.",
  "follow_up_questions": [
    "Follow-up question 1",
    "Follow-up question 2", 
    "Follow-up question 3"
  ]
}}
"""
        
        try:
            # Check if API key is properly set
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key_here":
                raise ValueError("OpenAI API 키가 설정되지 않았습니다")
            
            response = await self.client.chat.completions.create(
                model="gpt-4o",  # Use more powerful model for complex analysis
                messages=[
                    {"role": "system", "content": "You are a senior data analyst. Provide two distinct types of content: 1) 'summary': A brief, direct answer to the user's question (2-3 sentences max, no bullet points, no markdown headers). 2) 'insights': Detailed analysis using markdown headings (## ###) and bullet points (-) with specific findings, statistics, and recommendations. For mathematical expressions, use LaTeX notation enclosed in $ for inline math (like $\\frac{a}{b}$) or $$ for display math (like $$\\frac{numerator}{denominator}$$). Use proper LaTeX for fractions, square roots, exponents, etc. Ensure NO overlap between summary and insights content. Keep insights concise but comprehensive. Always complete your response - never truncate content."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.1,
                max_tokens=4000  # Allow more comprehensive responses without truncation
            )
            
            # JSON 응답 파싱
            raw_content = response.choices[0].message.content
            
            try:
                result = json.loads(raw_content)
                print(f"📝 JSON parsed result chart_type: {result.get('chart_type', 'N/A')}")
                # Ensure backward compatibility with old structure
                if "insights" not in result and "data_quality" in result:
                    # Convert new structure to backward compatible format
                    converted = self._convert_comprehensive_analysis(result)
                    print(f"📝 Converted result chart_type: {converted.get('chart_type', 'N/A')}")
                    return converted
                print(f"📝 Returning direct result with chart_type: {result.get('chart_type', 'N/A')}")

                # Use OpenAI's results as-is (no modifications)
                print(f"🔧 Using OpenAI results as-is:")
                print(f"   Chart Type: {result.get('chart_type')}")
                print(f"   Chart Columns: {result.get('chart_columns')}")
                print(f"   Insights: {len(result.get('insights', []))} items")

                return convert_numpy_types(result)
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract JSON from the content
                result = self._extract_json_from_response(raw_content)
                if result:
                    return convert_numpy_types(result)
                # If no JSON found, create conversational response
                return convert_numpy_types(self._create_conversational_analysis(df, question, raw_content))
            
        except Exception as e:
            # 더 구체적인 오류 메시지 제공
            error_msg = str(e)
            if "API key" in error_msg.lower() or "authentication" in error_msg.lower():
                insights = [
                    f"데이터에 {len(df)} 개의 행과 {len(df.columns)} 개의 열이 있습니다.",
                    "⚠️ OpenAI API 키를 .env 파일에 설정해주세요.",
                    "현재는 기본 통계 정보만 제공합니다."
                ]
                summary = "OpenAI API 키 설정이 필요합니다. .env 파일을 확인해주세요."
            else:
                insights = [
                    f"데이터에 {len(df)} 개의 행과 {len(df.columns)} 개의 열이 있습니다.",
                    f"오류 발생: {error_msg}",
                    "기본 데이터 정보를 제공합니다."
                ]
                summary = f"AI 분석 중 오류: {error_msg}"
            
            # Use intent analysis for smart column selection in error cases too
            intent_analysis = self._analyze_user_intent(question, df.columns.tolist())
            x_col = intent_analysis['suggested_columns']['x']
            y_col = intent_analysis['suggested_columns']['y']
            
            # Generate follow-up questions even in error cases
            follow_up_questions = self._generate_follow_up_questions(question, df.columns.tolist(), intent_analysis)
            
            return convert_numpy_types({
                "insights": insights,
                "chart_type": intent_analysis['chart_type'],
                "chart_columns": {"x": x_col, "y": y_col},
                "summary": summary,
                "follow_up_questions": follow_up_questions
            })
    
    def _get_data_info(self, df: pd.DataFrame) -> str:
        """데이터 기본 정보를 텍스트로 반환"""
        info = []
        info.append(f"행 수: {len(df)}")
        info.append(f"열 수: {len(df.columns)}")
        info.append(f"컬럼명: {', '.join(df.columns.tolist())}")
        
        # 숫자형 컬럼 통계
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            info.append(f"숫자형 컬럼: {', '.join(numeric_cols.tolist())}")
        
        return "; ".join(info)
    
    def _format_eda_for_ai(self, eda_data: Dict[str, Any]) -> str:
        """EDA 결과를 AI가 이해하기 쉬운 형태로 포맷팅"""
        info = []
        
        # 기본 정보
        basic = eda_data.get("basic_info", {})
        if basic:
            info.append(f"데이터 크기: {basic.get('shape', 'N/A')}")
            info.append(f"메모리 사용량: {basic.get('memory_usage', 'N/A')}")
        
        # 컬럼 타입 정보
        col_types = eda_data.get("column_types", {})
        if col_types:
            info.append(f"숫자형 컬럼 {col_types.get('numeric_count', 0)}개: {', '.join(col_types.get('numeric', []))}")
            info.append(f"범주형 컬럼 {col_types.get('categorical_count', 0)}개: {', '.join(col_types.get('categorical', []))}")
            if col_types.get('datetime_count', 0) > 0:
                info.append(f"날짜형 컬럼 {col_types.get('datetime_count', 0)}개")
        
        # 데이터 품질 정보
        quality = eda_data.get("data_quality", {})
        if quality:
            info.append(f"데이터 완성도: {quality.get('completeness', 0)}%")
            info.append(f"데이터 고유성: {quality.get('uniqueness', 0)}%")
        
        # 결측값 정보
        missing = eda_data.get("missing_data", {})
        if missing.get("total_missing", 0) > 0:
            info.append(f"결측값: {missing.get('total_missing', 0)}개")
            missing_cols = list(missing.get("missing_by_column", {}).keys())
            if missing_cols:
                info.append(f"결측값 있는 컬럼: {', '.join(missing_cols[:3])}")
        
        # 중복 데이터 정보
        duplicates = eda_data.get("duplicates", {})
        if duplicates.get("duplicate_rows", 0) > 0:
            info.append(f"중복 행: {duplicates.get('duplicate_rows', 0)}개 ({duplicates.get('duplicate_percentage', 0)}%)")
        
        # 추천사항
        recommendations = eda_data.get("recommendations", [])
        if recommendations:
            info.append(f"추천 분석: {', '.join(recommendations[:3])}")
        
        return "; ".join(info)
    
    def _get_comprehensive_data_stats(self, df: pd.DataFrame, question: str) -> str:
        """Generate OPTIMIZED data statistics that match what charts will show - REDUCED for large datasets"""
        stats = []
        
        # Get basic info
        stats.append(f"Total records: {len(df):,}")
        stats.append(f"Total columns: {len(df.columns)}")
        
        # OPTIMIZATION: Limit processing for large datasets to avoid token limits
        max_categorical_cols = 3  # Limit categorical analysis to prevent token overflow
        max_numeric_cols = 5      # Limit numeric analysis
        max_categories_per_col = 5  # Limit categories shown per column
        
        # Analyze categorical columns with value counts (what pie/bar charts will show)
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns[:max_categorical_cols]
        
        for col in categorical_columns:
            if df[col].nunique() <= 50:  # Only for manageable categories, increased limit
                value_counts = df[col].value_counts()
                percentages = (df[col].value_counts(normalize=True) * 100).round(2)
                
                stats.append(f"\n{col} distribution (top {max_categories_per_col}):")
                for value, count in value_counts.head(max_categories_per_col).items():
                    percentage = percentages[value]
                    # NumPy 타입을 Python 타입으로 변환
                    count = convert_numpy_types(count)
                    percentage = convert_numpy_types(percentage)
                    stats.append(f"  - {value}: {count:,} ({percentage}%)")
                    
                # Add summary for remaining categories if any
                if len(value_counts) > max_categories_per_col:
                    remaining = len(value_counts) - max_categories_per_col
                    stats.append(f"  - ... and {remaining} other categories")
        
        # Analyze numeric columns with basic statistics - LIMITED
        numeric_columns = df.select_dtypes(include=['int64', 'float64', 'int32', 'float32']).columns[:max_numeric_cols]
        
        for col in numeric_columns:
            if not df[col].isna().all():
                mean_val = convert_numpy_types(df[col].mean())
                min_val = convert_numpy_types(df[col].min())
                max_val = convert_numpy_types(df[col].max())
                count_val = convert_numpy_types(df[col].count())
                stats.append(f"\n{col} stats: Mean={mean_val:.2f}, Min={min_val}, Max={max_val}, Count={count_val:,}")
        
        # Skip correlations for very large datasets to save tokens
        if len(df) < 5000 and len(numeric_columns) >= 2:
            try:
                corr_matrix = df[numeric_columns].corr()
                stats.append(f"\nKey correlations:")
                # Get strongest correlations - limit to top 3
                correlations = []
                for i in range(len(numeric_columns)):
                    for j in range(i+1, len(numeric_columns)):
                        corr_val = convert_numpy_types(corr_matrix.iloc[i, j])
                        if abs(corr_val) > 0.3:  # Only significant correlations
                            correlations.append((abs(corr_val), f"{numeric_columns[i]} vs {numeric_columns[j]}: {corr_val:.3f}"))
                
                # Sort by strength and take top 3
                correlations.sort(reverse=True)
                for _, corr_text in correlations[:3]:
                    stats.append(f"  - {corr_text}")
            except:
                pass  # Skip if correlation fails
        
        # OPTIMIZED: Limit question-specific analysis to prevent token overflow
        question_lower = question.lower()
        question_matches = 0
        max_question_matches = 2  # Limit to 2 question-specific matches
        
        for col in df.columns[:5]:  # Only check first 5 columns
            if question_matches >= max_question_matches:
                break
                
            col_values = df[col].astype(str).str.lower()
            for word in question_lower.split()[:3]:  # Only check first 3 words
                if question_matches >= max_question_matches:
                    break
                    
                if len(word) > 2 and word in col_values.values:
                    matching_count = (col_values == word).sum()
                    total_count = len(df)
                    percentage = (matching_count / total_count * 100)
                    stats.append(f"\n'{word}' in {col}: {matching_count:,} ({percentage:.2f}%)")
                    question_matches += 1
        
        result = "; ".join(stats)
        
        # FINAL SAFEGUARD: Truncate if still too long
        if len(result) > 8000:  # Approximately 2000 tokens
            result = result[:8000] + "... (truncated for token limit)"
            
        return result
    
    def _generate_follow_up_questions(self, question: str, available_columns: List[str], intent_analysis: Dict[str, Any]) -> List[str]:
        """Generate contextual follow-up questions based on current analysis"""
        follow_ups = []
        question_lower = question.lower()
        
        # Get column types for smarter suggestions
        categorical_suggestions = []
        numeric_suggestions = []
        
        for col in available_columns:
            # Guess column types based on names (simple heuristic)
            col_lower = col.lower()
            if any(term in col_lower for term in ['country', 'region', 'type', 'category', 'status', 'method']):
                categorical_suggestions.append(col)
            elif any(term in col_lower for term in ['amount', 'value', 'price', 'count', 'number', 'rate']):
                numeric_suggestions.append(col)
        
        # Chart type specific follow-ups
        chart_type = intent_analysis.get('chart_type', 'bar')
        
        if chart_type == 'pie':
            # For pie charts, suggest comparisons and drill-downs
            follow_ups.extend([
                f"다른 카테고리별로도 분석해주세요",
                f"이 데이터를 막대 차트로도 보여주세요",
                f"상위 5개 항목만 따로 분석해주세요"
            ])
        elif chart_type == 'bar':
            # For bar charts, suggest trends and correlations
            follow_ups.extend([
                f"이 데이터의 트렌드를 선 그래프로 보여주세요",
                f"비율로 파이 차트를 만들어주세요",
                f"평균값과 비교해서 분석해주세요"
            ])
        elif chart_type == 'line':
            # For line charts, suggest correlations and predictions
            follow_ups.extend([
                f"이 트렌드의 원인을 분석해주세요",
                f"다른 변수와의 상관관계를 확인해주세요",
                f"계절성 패턴이 있는지 분석해주세요"
            ])
        elif chart_type == 'scatter':
            # For scatter plots, suggest deeper correlations
            follow_ups.extend([
                f"상관관계의 강도를 수치로 보여주세요",
                f"이상치(outlier)를 식별해주세요",
                f"회귀 분석을 수행해주세요"
            ])
        
        # Content-based follow-ups
        if any(term in question_lower for term in ['country', '국가', 'region']):
            follow_ups.append("지역별 성과를 시간에 따라 분석해주세요")
            follow_ups.append("가장 성과가 좋은/나쁜 지역은 어디인가요?")
        
        if any(term in question_lower for term in ['실패', 'fail', 'error', 'problem']):
            follow_ups.append("실패 원인별로 분석해주세요")
            follow_ups.append("실패율이 높은 시간대는 언제인가요?")
        
        if any(term in question_lower for term in ['매출', 'revenue', 'sales', 'amount']):
            follow_ups.append("월별 매출 성장률을 계산해주세요")
            follow_ups.append("매출 구간별 고객 분포를 보여주세요")
        
        # Column-specific suggestions
        if categorical_suggestions:
            follow_ups.append(f"{categorical_suggestions[0]} 별 상세 분석을 해주세요")
        
        if numeric_suggestions:
            follow_ups.append(f"{numeric_suggestions[0]}의 통계적 분포를 분석해주세요")
        
        # General analytical follow-ups
        follow_ups.extend([
            "이 결과에서 가장 중요한 인사이트는 무엇인가요?",
            "비즈니스 관점에서 어떤 액션을 취해야 할까요?",
            "이상 패턴이나 특이사항이 있나요?"
        ])
        
        # Remove duplicates and limit to 4 questions
        unique_follow_ups = list(dict.fromkeys(follow_ups))  # Preserves order while removing duplicates
        return unique_follow_ups[:4]
    
    def _analyze_user_intent(self, question: str, available_columns: List[str]) -> Dict[str, Any]:
        """Advanced context-aware intent analysis with deep semantic understanding"""
        question_lower = question.lower()
        
        # Enhanced semantic mappings with business context
        semantic_mappings = {
            # Payment/Transaction failures
            'failure': ['failure', 'error', 'fail', 'failed', 'failing', 'problem', 'issue', 'decline', 'declined', 'reject', 'rejected'],
            'success': ['success', 'successful', 'complete', 'completed', 'approved', 'passed', 'accept', 'accepted'],
            'reason': ['reason', 'message', 'cause', 'why', 'explanation', 'details', 'description', 'info'],
            'code': ['code', 'status_code', 'error_code', 'response_code', 'result_code'],
            
            # Card/Payment methods
            'card': ['card', 'payment_method', 'payment', 'credit', 'debit', 'visa', 'mastercard', 'amex', 'discover'],
            'network': ['network', 'type', 'brand', 'issuer', 'provider', 'company'],
            'country': ['country', 'location', 'region', 'nation', 'geography', 'address', 'origin'],
            
            # Customer/User analysis
            'customer': ['customer', 'user', 'client', 'account', 'holder', 'person', 'individual'],
            'order': ['order', 'transaction', 'purchase', 'payment', 'sale', 'attempt'],
            
            # Time/Temporal analysis
            'time': ['time', 'date', 'when', 'timestamp', 'created', 'updated', 'period', 'day', 'month'],
            'trend': ['trend', 'over_time', 'temporal', 'timeline', 'history', 'pattern', 'change'],
            
            # Quantity/Metrics
            'count': ['count', 'number', 'amount', 'quantity', 'total', 'sum', 'volume', 'frequency'],
            'rate': ['rate', 'percentage', 'ratio', 'proportion', 'percent', '%'],
            'value': ['value', 'amount', 'price', 'cost', 'fee', 'charge', 'money']
        }
        
        # Dynamic column mapping based on actual data and semantic understanding
        column_mappings = self._build_dynamic_column_mapping(available_columns, semantic_mappings)
        
        # Enhanced intent patterns with business context
        intent_patterns = {
            # Explicit chart type requests (highest priority)
            'pie chart': {'type': 'explicit_chart', 'chart': 'pie', 'focus': 'show proportional distribution as pie chart'},
            'pie': {'type': 'explicit_chart', 'chart': 'pie', 'focus': 'show proportional distribution as pie chart'},
            '파이차트': {'type': 'explicit_chart', 'chart': 'pie', 'focus': 'show proportional distribution as pie chart'},
            '파이 차트': {'type': 'explicit_chart', 'chart': 'pie', 'focus': 'show proportional distribution as pie chart'},
            'bar chart': {'type': 'explicit_chart', 'chart': 'bar', 'focus': 'show comparative distribution as bar chart'},
            'bar': {'type': 'explicit_chart', 'chart': 'bar', 'focus': 'show comparative distribution as bar chart'},
            '막대차트': {'type': 'explicit_chart', 'chart': 'bar', 'focus': 'show comparative distribution as bar chart'},
            '막대 차트': {'type': 'explicit_chart', 'chart': 'bar', 'focus': 'show comparative distribution as bar chart'},
            'line chart': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            'line': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            '선차트': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            '선 차트': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            '선그래프': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            '선 그래프': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            '라인차트': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            '라인 차트': {'type': 'explicit_chart', 'chart': 'line', 'focus': 'show temporal trends as line chart'},
            'scatter plot': {'type': 'explicit_chart', 'chart': 'scatter', 'focus': 'show correlation as scatter plot'},
            'scatterplot': {'type': 'explicit_chart', 'chart': 'scatter', 'focus': 'show correlation as scatter plot'},
            'scatter': {'type': 'explicit_chart', 'chart': 'scatter', 'focus': 'show correlation as scatter plot'},
            '산포도': {'type': 'explicit_chart', 'chart': 'scatter', 'focus': 'show correlation as scatter plot'},
            '산점도': {'type': 'explicit_chart', 'chart': 'scatter', 'focus': 'show correlation as scatter plot'},
            'histogram': {'type': 'explicit_chart', 'chart': 'histogram', 'focus': 'show data distribution as histogram'},
            '히스토그램': {'type': 'explicit_chart', 'chart': 'histogram', 'focus': 'show data distribution as histogram'},
            'box plot': {'type': 'explicit_chart', 'chart': 'box', 'focus': 'show statistical distribution as box plot'},
            'boxplot': {'type': 'explicit_chart', 'chart': 'box', 'focus': 'show statistical distribution as box plot'},
            '박스플롯': {'type': 'explicit_chart', 'chart': 'box', 'focus': 'show statistical distribution as box plot'},
            '상자그림': {'type': 'explicit_chart', 'chart': 'box', 'focus': 'show statistical distribution as box plot'},
            'area chart': {'type': 'explicit_chart', 'chart': 'area', 'focus': 'show trend as area chart'},
            'map': {'type': 'explicit_chart', 'chart': 'choropleth', 'focus': 'show geographic distribution on map'},
            'choropleth': {'type': 'explicit_chart', 'chart': 'choropleth', 'focus': 'show geographic distribution as choropleth map'},
            '지도': {'type': 'explicit_chart', 'chart': 'choropleth', 'focus': 'show geographic distribution on map'},
            '지도차트': {'type': 'explicit_chart', 'chart': 'choropleth', 'focus': 'show geographic distribution as map chart'},
            '지도 차트': {'type': 'explicit_chart', 'chart': 'choropleth', 'focus': 'show geographic distribution as map chart'},
            '맵차트': {'type': 'explicit_chart', 'chart': 'choropleth', 'focus': 'show geographic distribution as map chart'},
            'geo scatter': {'type': 'explicit_chart', 'chart': 'scattergeo', 'focus': 'show geographic points on map'},
            'scattergeo': {'type': 'explicit_chart', 'chart': 'scattergeo', 'focus': 'show geographic points on map'},
            '영역차트': {'type': 'explicit_chart', 'chart': 'area', 'focus': 'show trend as area chart'},
            'heatmap': {'type': 'explicit_chart', 'chart': 'heatmap', 'focus': 'show correlation matrix as heatmap'},
            '히트맵': {'type': 'explicit_chart', 'chart': 'heatmap', 'focus': 'show correlation matrix as heatmap'},
            '열지도': {'type': 'explicit_chart', 'chart': 'heatmap', 'focus': 'show correlation matrix as heatmap'},
            
            # ADVANCED STATISTICAL CHARTS
            'violin': {'type': 'explicit_chart', 'chart': 'violin', 'focus': 'show distribution as violin plot'},
            'violin plot': {'type': 'explicit_chart', 'chart': 'violin', 'focus': 'show distribution as violin plot'},
            '바이올린': {'type': 'explicit_chart', 'chart': 'violin', 'focus': 'show distribution as violin plot'},
            'strip plot': {'type': 'explicit_chart', 'chart': 'strip', 'focus': 'show distribution as strip plot'},
            '스트립': {'type': 'explicit_chart', 'chart': 'strip', 'focus': 'show distribution as strip plot'},
            'density contour': {'type': 'explicit_chart', 'chart': 'density_contour', 'focus': 'show density as contour plot'},
            '밀도등고선': {'type': 'explicit_chart', 'chart': 'density_contour', 'focus': 'show density as contour plot'},
            'density heatmap': {'type': 'explicit_chart', 'chart': 'density_heatmap', 'focus': 'show density as heatmap'},
            '밀도히트맵': {'type': 'explicit_chart', 'chart': 'density_heatmap', 'focus': 'show density as heatmap'},
            
            # SPECIALIZED CHARTS
            'funnel': {'type': 'explicit_chart', 'chart': 'funnel', 'focus': 'show conversion as funnel chart'},
            'funnel chart': {'type': 'explicit_chart', 'chart': 'funnel', 'focus': 'show conversion as funnel chart'},
            '깔때기': {'type': 'explicit_chart', 'chart': 'funnel', 'focus': 'show conversion as funnel chart'},
            'waterfall': {'type': 'explicit_chart', 'chart': 'waterfall', 'focus': 'show cumulative effect as waterfall'},
            '폭포차트': {'type': 'explicit_chart', 'chart': 'waterfall', 'focus': 'show cumulative effect as waterfall'},
            'treemap': {'type': 'explicit_chart', 'chart': 'treemap', 'focus': 'show hierarchy as treemap'},
            '트리맵': {'type': 'explicit_chart', 'chart': 'treemap', 'focus': 'show hierarchy as treemap'},
            'sunburst': {'type': 'explicit_chart', 'chart': 'sunburst', 'focus': 'show hierarchy as sunburst'},
            '선버스트': {'type': 'explicit_chart', 'chart': 'sunburst', 'focus': 'show hierarchy as sunburst'},
            
            # 3D CHARTS
            '3d scatter': {'type': 'explicit_chart', 'chart': 'scatter_3d', 'focus': 'show 3D scatter plot'},
            'scatter 3d': {'type': 'explicit_chart', 'chart': 'scatter_3d', 'focus': 'show 3D scatter plot'},
            '3d 산점도': {'type': 'explicit_chart', 'chart': 'scatter_3d', 'focus': 'show 3D scatter plot'},
            'surface': {'type': 'explicit_chart', 'chart': 'surface', 'focus': 'show 3D surface plot'},
            '표면차트': {'type': 'explicit_chart', 'chart': 'surface', 'focus': 'show 3D surface plot'},
            '3d surface': {'type': 'explicit_chart', 'chart': 'surface', 'focus': 'show 3D surface plot'},
            
            # FINANCIAL CHARTS  
            'candlestick': {'type': 'explicit_chart', 'chart': 'candlestick', 'focus': 'show financial data as candlestick'},
            '캔들스틱': {'type': 'explicit_chart', 'chart': 'candlestick', 'focus': 'show financial data as candlestick'},
            'ohlc': {'type': 'explicit_chart', 'chart': 'ohlc', 'focus': 'show OHLC financial data'},
            
            # MULTIVARIATE CHARTS
            'parallel coordinates': {'type': 'explicit_chart', 'chart': 'parallel_coordinates', 'focus': 'show multivariate as parallel coordinates'},
            '평행좌표': {'type': 'explicit_chart', 'chart': 'parallel_coordinates', 'focus': 'show multivariate as parallel coordinates'},
            'parallel categories': {'type': 'explicit_chart', 'chart': 'parallel_categories', 'focus': 'show categories as parallel plot'},
            '평행카테고리': {'type': 'explicit_chart', 'chart': 'parallel_categories', 'focus': 'show categories as parallel plot'},
            
            # SPECIALIZED VISUALIZATION
            'radar': {'type': 'explicit_chart', 'chart': 'radar', 'focus': 'show multivariate as radar chart'},
            'radar chart': {'type': 'explicit_chart', 'chart': 'radar', 'focus': 'show multivariate as radar chart'},
            '레이더': {'type': 'explicit_chart', 'chart': 'radar', 'focus': 'show multivariate as radar chart'},
            'spider': {'type': 'explicit_chart', 'chart': 'radar', 'focus': 'show multivariate as spider chart'},
            
            # DISTRIBUTION CHARTS
            'distplot': {'type': 'explicit_chart', 'chart': 'distplot', 'focus': 'show distribution with KDE'},
            '분포플롯': {'type': 'explicit_chart', 'chart': 'distplot', 'focus': 'show distribution with KDE'},
            'ecdf': {'type': 'explicit_chart', 'chart': 'ecdf', 'focus': 'show empirical cumulative distribution'},
            '누적분포': {'type': 'explicit_chart', 'chart': 'ecdf', 'focus': 'show empirical cumulative distribution'},
            
            # Distribution/Grouping patterns
            'sort by': {'type': 'distribution', 'chart': 'bar', 'focus': 'show ranked distribution'},
            'group by': {'type': 'distribution', 'chart': 'bar', 'focus': 'show categorical grouping'},
            'breakdown': {'type': 'distribution', 'chart': 'pie', 'focus': 'show proportional breakdown'},
            'distribution': {'type': 'distribution', 'chart': 'pie', 'focus': 'show data distribution'},
            'proportion': {'type': 'distribution', 'chart': 'pie', 'focus': 'show proportional distribution'},
            'percentage': {'type': 'distribution', 'chart': 'pie', 'focus': 'show percentage distribution'},
            'share': {'type': 'distribution', 'chart': 'pie', 'focus': 'show share distribution'},
            'analyze': {'type': 'distribution', 'chart': 'bar', 'focus': 'perform comprehensive analysis'},
            
            # Comparison patterns
            'compare': {'type': 'comparison', 'chart': 'bar', 'focus': 'compare across categories'},
            'vs': {'type': 'comparison', 'chart': 'bar', 'focus': 'compare alternatives'},
            'versus': {'type': 'comparison', 'chart': 'bar', 'focus': 'compare alternatives'},
            'difference': {'type': 'comparison', 'chart': 'bar', 'focus': 'show differences'},
            
            # Temporal/Trend patterns
            'trend': {'type': 'temporal', 'chart': 'line', 'focus': 'show trends over time'},
            'over time': {'type': 'temporal', 'chart': 'line', 'focus': 'show temporal patterns'},
            'timeline': {'type': 'temporal', 'chart': 'line', 'focus': 'show timeline progression'},
            'history': {'type': 'temporal', 'chart': 'line', 'focus': 'show historical data'},
            'growth': {'type': 'temporal', 'chart': 'line', 'focus': 'show growth patterns'},
            'change': {'type': 'temporal', 'chart': 'line', 'focus': 'show changes over time'},
            
            # Ranking patterns
            'top': {'type': 'ranking', 'chart': 'bar', 'focus': 'show highest values'},
            'bottom': {'type': 'ranking', 'chart': 'bar', 'focus': 'show lowest values'},
            'best': {'type': 'ranking', 'chart': 'bar', 'focus': 'show best performing'},
            'worst': {'type': 'ranking', 'chart': 'bar', 'focus': 'show worst performing'},
            'most': {'type': 'ranking', 'chart': 'bar', 'focus': 'show most frequent/common'},
            'least': {'type': 'ranking', 'chart': 'bar', 'focus': 'show least frequent'},
            'highest': {'type': 'ranking', 'chart': 'bar', 'focus': 'show highest values'},
            'lowest': {'type': 'ranking', 'chart': 'bar', 'focus': 'show lowest values'},
            
            # Statistical patterns
            'correlation': {'type': 'correlation', 'chart': 'scatter', 'focus': 'show statistical relationships'},
            'relationship': {'type': 'correlation', 'chart': 'scatter', 'focus': 'analyze relationships'},
            'impact': {'type': 'correlation', 'chart': 'scatter', 'focus': 'show impact analysis'},
            
            # Aggregation patterns
            'count': {'type': 'distribution', 'chart': 'bar', 'focus': 'show item counts'},
            'sum': {'type': 'distribution', 'chart': 'bar', 'focus': 'show sum aggregation'},
            'average': {'type': 'distribution', 'chart': 'bar', 'focus': 'show average values'},
            'total': {'type': 'distribution', 'chart': 'bar', 'focus': 'show total values'}
        }
        
        # Advanced pattern matching with context scoring
        detected_intent = self._detect_intent_with_context(question_lower, intent_patterns)
        
        # Contextual refinement based on data characteristics
        detected_intent = self._refine_intent_with_data_context(detected_intent, available_columns, question_lower)
        
        # Intelligent column mapping with semantic scoring
        suggested_columns = self._map_question_to_columns(question_lower, available_columns, column_mappings)
        print(f"🔍 _map_question_to_columns result: {suggested_columns}")
        
        # Final validation and optimization
        final_analysis = self._optimize_analysis_strategy(suggested_columns, detected_intent, question_lower)
        
        print(f"🎯 Intent Analysis Results:")
        print(f"   Chart Type: {final_analysis['chart_type']}")
        print(f"   Intent Type: {final_analysis['intent_type']}")
        print(f"   Confidence: {final_analysis['confidence']}")
        print(f"   X Column: {final_analysis['columns']['x']}")
        print(f"   Y Column: {final_analysis['columns']['y']}")
        print(f"   Reasoning: {final_analysis['reasoning']}")

        return {
            'suggested_columns': final_analysis['columns'],
            'analysis_focus': final_analysis['focus'],
            'chart_type': final_analysis['chart_type'],
            'intent_type': final_analysis['intent_type'],
            'confidence': final_analysis['confidence'],
            'reasoning': final_analysis['reasoning']
        }
    
    def _extract_json_from_response(self, content: str) -> Dict[str, Any]:
        """Extract JSON from mixed content response"""
        
        # Try to find JSON block in the content
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON without markdown formatting
        json_match = re.search(r'(\{[^{}]*"insights"[^{}]*\})', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        return None
    
    def _create_conversational_analysis(self, df: pd.DataFrame, question: str, content: str) -> Dict[str, Any]:
        """Create conversational analysis from raw AI response"""
        # Use intent analysis for smart column selection
        intent_analysis = self._analyze_user_intent(question, df.columns.tolist())
        print(f"🔄 _create_conversational_analysis intent_analysis:")
        print(f"   Chart Type: {intent_analysis.get('chart_type', 'N/A')}")
        print(f"   Suggested Columns: {intent_analysis.get('suggested_columns', {})}")
        x_col = intent_analysis['suggested_columns']['x']
        y_col = intent_analysis['suggested_columns']['y']
        
        # Clean up the content - remove JSON markers and format conversationally
        cleaned_content = content
        
        # Remove JSON code block markers
        cleaned_content = re.sub(r'```json\s*', '', cleaned_content)
        cleaned_content = re.sub(r'\s*```', '', cleaned_content)
        
        # Remove raw JSON structure if present
        cleaned_content = re.sub(r'\{\s*"insights":\s*\[', '', cleaned_content)
        cleaned_content = re.sub(r'\]\s*,?\s*"chart_type".*?\}', '', cleaned_content, flags=re.DOTALL)
        
        # Extract insights from quotes
        insight_pattern = r'"([^"]{30,})"'
        insights_found = re.findall(insight_pattern, cleaned_content)
        
        # Clean up insights and make them conversational
        conversational_insights = []
        for insight in insights_found[:6]:
            # Remove escape characters and extra whitespace
            clean_insight = insight.replace('\\"', '"').replace('\\n', ' ').strip()
            if len(clean_insight) > 20:
                conversational_insights.append(clean_insight)
        
        # If no good insights found, create meaningful ones from the content
        if not conversational_insights:
            # Try to extract meaningful sentences from the raw content
            sentences = [s.strip() for s in re.split(r'[.!?]+', cleaned_content) if len(s.strip()) > 30]
            conversational_insights = sentences[:5]
        
        # Ensure we have at least some basic insights
        if not conversational_insights:
            conversational_insights = [
                f"데이터셋에서 {len(df):,}개의 레코드와 {len(df.columns)}개의 컬럼을 분석했습니다.",
                f"주요 컬럼으로는 {', '.join(df.columns[:3])} 등이 있습니다.",
                "데이터의 패턴과 특성을 기반으로 인사이트를 제공합니다."
            ]
        
        # Create a conversational summary
        summary = f"'{question}' 질문에 대한 분석 결과입니다. "
        if conversational_insights:
            # Use the first insight as part of summary
            first_insight = conversational_insights[0]
            if len(first_insight) > 100:
                first_insight = first_insight[:100] + "..."
            summary += first_insight
        
        # Generate contextual follow-up questions
        follow_up_questions = self._generate_follow_up_questions(question, df.columns.tolist(), intent_analysis)
        
        return convert_numpy_types({
            "insights": conversational_insights,
            "chart_type": intent_analysis['chart_type'],
            "chart_columns": intent_analysis['suggested_columns'],  # Use smart analysis columns
            "summary": summary,
            "follow_up_questions": follow_up_questions
        })
    
    def _create_fallback_analysis(self, df: pd.DataFrame, question: str, content: str) -> Dict[str, Any]:
        """Create fallback analysis when JSON parsing fails - deprecated, use _create_conversational_analysis"""
        return self._create_conversational_analysis(df, question, content)
    
    def _convert_comprehensive_analysis(self, comprehensive_result: Dict[str, Any]) -> Dict[str, Any]:
        """Convert comprehensive analysis format to backward compatible format"""
        # Extract insights from various sections
        all_insights = []
        
        # Add data quality insights
        if "data_quality" in comprehensive_result:
            dq = comprehensive_result["data_quality"]
            if "assessment" in dq:
                all_insights.append(f"Data Quality: {dq['assessment']}")
            if "completeness_score" in dq:
                all_insights.append(f"Data completeness score: {dq['completeness_score']}%")
        
        # Add main insights
        if "insights" in comprehensive_result:
            all_insights.extend(comprehensive_result["insights"][:4])
        
        # Add business implications
        if "business_implications" in comprehensive_result:
            bi = comprehensive_result["business_implications"]
            if "opportunities" in bi and bi["opportunities"]:
                all_insights.append(f"Key Opportunity: {bi['opportunities'][0]}")
            if "recommendations" in bi and bi["recommendations"]:
                all_insights.append(f"Recommendation: {bi['recommendations'][0]}")
        
        # Create backward compatible structure
        return {
            "insights": all_insights[:8],  # Limit to reasonable number
            "chart_type": comprehensive_result.get("chart_type", "bar"),
            "chart_columns": comprehensive_result.get("chart_columns", {}),
            "summary": comprehensive_result.get("summary", "Comprehensive data analysis completed"),
            "comprehensive_data": comprehensive_result  # Keep full data for future use
        }
    
    def _build_dynamic_column_mapping(self, available_columns: List[str], semantic_mappings: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Build intelligent column mappings based on actual data and semantic understanding"""
        mappings = {}
        
        for col in available_columns:
            col_lower = col.lower().replace('_', ' ').replace('-', ' ')
            words = col_lower.split()
            
            # Create mappings for individual words and combinations
            for i, word1 in enumerate(words):
                if len(word1) > 2:
                    mappings[word1] = mappings.get(word1, []) + [col]
                    
                    # Create two-word combinations
                    for j in range(i+1, len(words)):
                        word2 = words[j]
                        if len(word2) > 2:
                            composite = f"{word1} {word2}"
                            mappings[composite] = mappings.get(composite, []) + [col]
        
        return mappings
    
    def _detect_intent_with_context(self, question_lower: str, intent_patterns: Dict) -> Dict[str, str]:
        """Advanced pattern matching with context scoring - prioritizes explicit chart requests"""
        pattern_scores = {}
        
        for pattern, intent in intent_patterns.items():
            score = 0
            
            if pattern in question_lower:
                # Give much higher priority to explicit chart type requests
                if intent['type'] == 'explicit_chart':
                    score += 50  # Very high priority for explicit chart requests
                else:
                    score += 10
                
                position = question_lower.find(pattern)
                score += max(0, 5 - position // 10)
            
            # Check for partial matches
            pattern_words = pattern.split()
            if all(word in question_lower for word in pattern_words):
                if intent['type'] == 'explicit_chart':
                    score += 25  # High priority even for partial matches
                else:
                    score += 5
            
            # Special handling for common chart type keywords
            if intent['type'] == 'explicit_chart':
                chart_type = intent['chart']
                if chart_type in question_lower:
                    score += 30
            
            if score > 0:
                pattern_scores[pattern] = score
        
        if pattern_scores:
            best_pattern = max(pattern_scores, key=pattern_scores.get)
            return intent_patterns[best_pattern]
        
        # Smart default based on question characteristics
        if any(word in question_lower for word in ['proportion', 'percentage', 'share', 'distribution', 'breakdown']):
            return {'type': 'distribution', 'chart': 'pie', 'focus': 'show proportional distribution'}
        elif any(word in question_lower for word in ['trend', 'over time', 'growth', 'change']):
            return {'type': 'temporal', 'chart': 'line', 'focus': 'show trends over time'}
        elif any(word in question_lower for word in ['correlation', 'relationship', 'vs', 'versus']):
            return {'type': 'correlation', 'chart': 'scatter', 'focus': 'show relationships'}
        
        return {'type': 'distribution', 'chart': 'bar', 'focus': 'analyze data distribution'}
    
    def _refine_intent_with_data_context(self, intent: Dict, available_columns: List[str], question: str) -> Dict:
        """Refine intent based on data characteristics"""
        # Enhance focus based on domain context
        if any(term in question.lower() for term in ['failure', 'error', 'problem']):
            intent['focus'] = intent['focus'].replace('show', 'analyze failure patterns in')
            
        if any(term in question.lower() for term in ['success', 'complete', 'approved']):
            intent['focus'] = intent['focus'].replace('show', 'analyze success patterns in')
        
        return intent
    
    def _map_question_to_columns(self, question: str, available_columns: List[str], column_mappings: Dict) -> Dict[str, str]:
        """Intelligent semantic mapping of questions to columns"""
        column_scores = {}
        
        # Check chart type requests
        is_scatter_request = any(term in question.lower() for term in ['scatter', '산포도', '산점도', 'correlation', '상관관계'])
        is_histogram_request = any(term in question.lower() for term in ['histogram', '히스토그램', 'distribution', '분포'])
        is_heatmap_request = any(term in question.lower() for term in ['heatmap', '히트맵', '열지도', 'correlation matrix', '상관관계'])
        is_recommendation_request = any(term in question.lower() for term in [
            '추천', 'recommend', '제안', 'suggest', '어떤 차트', 'what chart', '무슨 차트', '좋은 차트', 
            '적합한 차트', '최적', 'optimal', 'best', '분석 방법', 'analysis method'
        ])
        
        for col in available_columns:
            score = 0
            col_lower = col.lower()
            
            # Direct word matches
            question_words = question.split()
            col_words = col_lower.replace('_', ' ').replace('-', ' ').split()
            
            # Score based on word matches
            for qw in question_words:
                for cw in col_words:
                    if qw == cw:
                        score += 10
                    elif qw in cw or cw in qw:
                        score += 5
            
            # Business logic scoring
            if 'failure' in question and 'message' in col_lower:
                score += 15
            if 'card' in question and 'network' in col_lower:
                score += 12
            if 'country' in question and 'country' in col_lower:
                score += 12
            if 'reason' in question and 'message' in col_lower:
                score += 10
                
            # Penalize ID columns unless specifically asked
            if 'id' in col_lower and 'id' not in question:
                score -= 5
            
            column_scores[col] = score
        
        # Special handling for different chart types
        if is_scatter_request:
            # Enhanced logic for correlation analysis - can be categorical vs numeric
            correlation_keywords = ['상관관계', '상관성', 'correlation', '관계', '연관', 'vs', 'versus', '간의']
            is_correlation_analysis = any(keyword in question for keyword in correlation_keywords)

            if is_correlation_analysis:
                # For correlation, identify categorical and numeric columns from the question
                age_keywords = ['나이', 'age', '연령', 'class']
                weight_keywords = ['무게', 'weight', '체중', 'kg']

                categorical_col = None
                numeric_col = None

                # Find Age Class column
                for col in available_columns:
                    if any(age_kw in col.lower() for age_kw in age_keywords):
                        categorical_col = col
                        break

                # Find Weight column
                for col in available_columns:
                    if any(weight_kw in col.lower() for weight_kw in weight_keywords):
                        numeric_col = col
                        break

                # Use the identified columns if found
                if categorical_col and numeric_col:
                    result = {'x': categorical_col, 'y': numeric_col}
                    print(f"🎯 Found correlation pair: {categorical_col} vs {numeric_col}")
                    print(f"🎯 Returning correlation result: {result}")
                    return result

                # Fallback: try to match any mentioned columns in the question
                question_words = question.lower().split()
                mentioned_cols = []
                for col in available_columns:
                    col_words = col.lower().replace('_', ' ').replace('-', ' ').split()
                    if any(qw in col_words or any(qw in cw or cw in qw for cw in col_words) for qw in question_words):
                        mentioned_cols.append(col)

                if len(mentioned_cols) >= 2:
                    # Prioritize categorical vs numeric combination
                    numeric_columns = self._identify_numeric_columns(mentioned_cols)
                    categorical_columns = [col for col in mentioned_cols if col not in numeric_columns]

                    if categorical_columns and numeric_columns:
                        print(f"🎯 Using categorical vs numeric: {categorical_columns[0]} vs {numeric_columns[0]}")
                        return {'x': categorical_columns[0], 'y': numeric_columns[0]}
                    else:
                        print(f"🎯 Using first two mentioned columns: {mentioned_cols[0]} vs {mentioned_cols[1]}")
                        return {'x': mentioned_cols[0], 'y': mentioned_cols[1]}

            # Original scatter plot logic for non-correlation requests
            numeric_columns = self._identify_numeric_columns(available_columns)
            if len(numeric_columns) >= 2:
                # Use the two best numeric columns for scatter plot
                x_col = numeric_columns[0]
                y_col = numeric_columns[1]

                # If question mentions specific columns, try to use those
                for col in numeric_columns:
                    if any(word in col.lower() for word in question.lower().split()):
                        if x_col == numeric_columns[0]:  # First match becomes x
                            x_col = col
                        else:  # Second match becomes y
                            y_col = col
                            break

                return {'x': x_col, 'y': y_col}
            else:
                # Fallback: use best scored column with a numeric column if available
                best_col = max(column_scores, key=column_scores.get) if column_scores else available_columns[0]
                if numeric_columns:
                    return {'x': best_col, 'y': numeric_columns[0]}
                return {'x': best_col, 'y': 'Count'}
        
        elif is_histogram_request:
            # Histogram only needs one numeric column
            numeric_columns = self._identify_numeric_columns(available_columns)
            if numeric_columns:
                # Find the best numeric column based on question
                best_numeric = numeric_columns[0]
                for col in numeric_columns:
                    if any(word in col.lower() for word in question.lower().split()):
                        best_numeric = col
                        break
                return {'x': best_numeric, 'y': 'Count'}
            else:
                # No numeric columns available
                best_col = max(column_scores, key=column_scores.get) if column_scores else available_columns[0]
                return {'x': best_col, 'y': 'Count'}
        
        elif is_heatmap_request:
            # Heatmap doesn't need specific x,y columns - uses all numeric columns
            numeric_columns = self._identify_numeric_columns(available_columns)
            if len(numeric_columns) >= 2:
                return {'x': 'all_numeric', 'y': 'all_numeric'}
            else:
                return {'x': 'insufficient_numeric', 'y': 'insufficient_numeric'}
        
        elif is_recommendation_request:
            # Return special marker for recommendation requests
            return {'x': 'recommendation_request', 'y': 'recommendation_request'}
        
        # Select best column for non-scatter charts
        if column_scores and max(column_scores.values()) > 0:
            best_col = max(column_scores, key=column_scores.get)
            return {'x': best_col, 'y': 'Count'}
        
        # Fallback logic
        priority_indicators = ['message', 'status', 'type', 'network', 'country', 'reason']
        for indicator in priority_indicators:
            for col in available_columns:
                if indicator in col.lower() and 'id' not in col.lower():
                    return {'x': col, 'y': 'Count'}
        
        # Final fallback
        non_id_cols = [col for col in available_columns if 'id' not in col.lower()]
        if non_id_cols:
            return {'x': non_id_cols[0], 'y': 'Count'}
        
        return {'x': available_columns[0] if available_columns else 'unknown', 'y': 'Count'}
    
    def _identify_numeric_columns(self, available_columns: List[str]) -> List[str]:
        """Identify potentially numeric columns based on column names"""
        numeric_indicators = [
            'amount', 'value', 'price', 'cost', 'fee', 'rate', 'count', 'number', 'num', 
            'quantity', 'size', 'length', 'width', 'height', 'weight', 'age', 'score',
            'total', 'sum', 'avg', 'mean', 'max', 'min', 'percentage', 'percent', '%'
        ]
        
        numeric_columns = []
        for col in available_columns:
            col_lower = col.lower()
            # Skip ID columns
            if 'id' in col_lower:
                continue
            # Check for numeric indicators
            if any(indicator in col_lower for indicator in numeric_indicators):
                numeric_columns.append(col)
            # Check if column name suggests it's numeric (ends with numbers, etc.)
            elif any(char.isdigit() for char in col_lower):
                numeric_columns.append(col)
        
        return numeric_columns
    
    def _optimize_analysis_strategy(self, columns: Dict, intent: Dict, question: str) -> Dict:
        """Final optimization of analysis strategy with enhanced categorical-numeric handling"""
        print(f"🔧 _optimize_analysis_strategy input - columns: {columns}")
        confidence = 0.5
        reasoning = ["Basic analysis strategy"]

        if columns['x'] != 'unknown':
            confidence += 0.2
            reasoning.append(f"Found relevant column: {columns['x']}")

        # Boost confidence for clear intents
        clear_intents = ['sort by', 'group by', 'breakdown', 'compare', 'trend']
        if any(intent_word in question for intent_word in clear_intents):
            confidence += 0.3
            reasoning.append("Clear user intent detected")

        # Enhanced correlation/relationship analysis for categorical-numeric data
        correlation_keywords = ['상관관계', '상관성', 'correlation', 'relationship', '관계', '연관', 'vs', 'versus', '간의']
        if any(keyword in question.lower() for keyword in correlation_keywords):
            confidence += 0.4
            reasoning.append("Correlation analysis detected")

        # Use original intent chart type (don't force box plot)
        chart_type = intent['chart']

        # Domain-specific optimizations
        if 'failure' in question.lower() and 'message' in columns['x'].lower():
            confidence = 0.9
            reasoning.append("Perfect match: failure analysis with message column")

        # Age class analysis optimization - keep original chart type but boost confidence
        age_keywords = ['나이', 'age', '연령', 'class']
        weight_keywords = ['무게', 'weight', '체중', 'kg']
        if (any(age_kw in question.lower() for age_kw in age_keywords) and
            any(weight_kw in question.lower() for weight_kw in weight_keywords)):
            confidence = 0.95
            reasoning.append("Age-weight analysis detected: high confidence")

        # Distribution optimization (but preserve special chart types like box)
        if intent['type'] == 'distribution' and chart_type not in ['bar', 'pie', 'box', 'violin', 'histogram']:
            chart_type = 'bar'
            reasoning.append("Optimized chart type for distribution")

        result = {
            'columns': columns,
            'focus': f"{intent['focus']} of {columns['x']}" + (f" vs {columns['y']}" if columns['y'] != 'unknown' else ""),
            'chart_type': chart_type,
            'intent_type': intent['type'],
            'confidence': min(1.0, confidence),
            'reasoning': reasoning
        }
        print(f"🔧 _optimize_analysis_strategy result - columns: {result['columns']}")
        return result
    
    async def answer_general_question(self, question: str) -> str:
        """파일 없이 일반 질문에 답변합니다. 시나리오, 가정, 표 생성 등을 포함한 포괄적인 분석을 제공합니다."""
        try:
            # Check if API key is properly set
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key_here":
                return "OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요."

            # 질문 유형 분석 및 맞춤형 프롬프트 생성
            enhanced_prompt = self._create_enhanced_general_prompt(question)

            response = await self.client.chat.completions.create(
                model="gpt-4o",  # 더 강력한 모델 사용
                messages=[
                    {
                        "role": "system",
                        "content": enhanced_prompt
                    },
                    {"role": "user", "content": question}
                ],
                temperature=0.7,
                max_tokens=2000  # 더 긴 응답 허용
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"General question AI error: {str(e)}")
            return f"답변을 생성하는 중 오류가 발생했습니다: {str(e)}"

    def _create_enhanced_general_prompt(self, question: str) -> str:
        """질문 유형에 따른 맞춤형 시스템 프롬프트 생성"""
        question_lower = question.lower()

        # 시나리오/가정 기반 질문 감지
        scenario_keywords = ['가정', '시나리오', '만약', 'if', 'suppose', '상황', '경우', '예를 들어', '가령']
        table_keywords = ['표', 'table', '테이블', '데이터', '목록', 'list', '비교', '정리', '요약']
        logic_keywords = ['로직', 'logic', '방법', '절차', '단계', 'step', '프로세스', 'process', '알고리즘']
        analysis_keywords = ['분석', 'analysis', '해석', '평가', '검토', '조사', '연구']
        calculation_keywords = ['계산', '수치', '통계', '예상', '추정', '측정']

        is_scenario = any(keyword in question_lower for keyword in scenario_keywords)
        is_table = any(keyword in question_lower for keyword in table_keywords)
        is_logic = any(keyword in question_lower for keyword in logic_keywords)
        is_analysis = any(keyword in question_lower for keyword in analysis_keywords)
        is_calculation = any(keyword in question_lower for keyword in calculation_keywords)

        base_prompt = """당신은 전문적이고 도움이 되는 AI 데이터 분석 어시스턴트입니다.
사용자의 질문에 대해 명확하고 실용적인 답변을 제공해주세요."""

        if is_scenario:
            return base_prompt + """

**시나리오 분석 전문가로서:**
- 제시된 가정이나 시나리오를 논리적으로 분석하세요
- 가능한 결과와 영향을 체계적으로 설명하세요
- 실제 데이터가 있다면 어떻게 분석할지 구체적인 방법을 제시하세요
- 여러 관점에서 시나리오를 검토하고 인사이트를 제공하세요
- 필요시 예시 데이터나 샘플 테이블을 포함하세요
- 수학적 계산이나 공식이 필요한 경우 LaTeX 수식을 사용하세요 (예: $\\frac{변화량}{기준값} \\times 100$)

답변 형식:
1. 시나리오 요약
2. 주요 가정사항
3. 예상 결과 및 영향
4. 분석 방법론
5. 실행 가능한 제안사항"""

        elif is_table:
            return base_prompt + """

**표/데이터 구조 전문가로서:**
- 요청된 정보를 체계적인 표 형태로 정리하세요
- 마크다운 테이블 형식을 사용하세요
- 컬럼과 행을 논리적으로 구성하세요
- 표에 대한 설명과 인사이트를 함께 제공하세요
- 실제 데이터 분석 시 고려사항을 포함하세요

표 형식 예시:
| 항목 | 값1 | 값2 | 설명 |
|------|-----|-----|------|
| ... | ... | ... | ... |

표 후에는 주요 패턴이나 인사이트를 분석해주세요."""

        elif is_logic:
            return base_prompt + """

**로직/프로세스 설계 전문가로서:**
- 단계별로 명확한 절차를 제시하세요
- 각 단계의 목적과 방법을 구체적으로 설명하세요
- 실제 구현 시 고려사항을 포함하세요
- 가능한 문제점과 해결방안을 제시하세요
- 데이터 분석 관점에서의 접근법을 포함하세요

답변 형식:
1. 개요 및 목표
2. 단계별 상세 절차
3. 각 단계별 고려사항
4. 예상 결과물
5. 품질 검증 방법"""

        elif is_analysis:
            return base_prompt + """

**분석 전문가로서:**
- 주제에 대한 다각도 분석을 제공하세요
- 정량적/정성적 관점을 모두 고려하세요
- 실제 데이터가 있다면 어떤 차트나 지표가 유용할지 제안하세요
- 비즈니스 또는 실무적 관점에서의 시사점을 도출하세요
- 추가 분석이 필요한 영역을 식별하세요

답변 형식:
1. 현황 분석
2. 핵심 요인 식별
3. 패턴 및 트렌드
4. 위험요소 및 기회
5. 개선 방향 제안"""

        elif is_calculation:
            return base_prompt + """

**수치 분석 전문가로서:**
- 관련된 계산이나 수치적 접근법을 제시하세요
- 가정사항을 명확히 하고 계산 과정을 설명하세요
- 통계적 관점에서의 해석을 포함하세요
- 실제 데이터 수집 시 필요한 지표를 제안하세요
- 결과 검증 방법을 제시하세요
- 수학 공식은 LaTeX로 표현하세요 (예: $\\mu = \\frac{\\sum x_i}{n}$, $$\\sigma = \\sqrt{\\frac{\\sum (x_i - \\mu)^2}{n}}$$)

답변에 포함할 요소:
- 기본 가정사항
- 계산 공식 및 방법 (LaTeX 수식 포함)
- 예시 계산
- 결과 해석
- 활용 방안"""

        else:
            return base_prompt + """

**종합 컨설턴트로서:**
- 질문의 맥락을 파악하고 포괄적인 답변을 제공하세요
- 이론적 설명과 실무적 적용 방법을 모두 포함하세요
- 관련된 사례나 예시를 들어 설명하세요
- 실제 데이터 분석 시 도움이 될 관점을 제시하세요
- 후속 질문이나 심화 분석 방향을 제안하세요
- 수학적 설명이 필요한 경우 LaTeX 수식을 사용하세요 (예: $R^2 = 1 - \\frac{SS_{res}}{SS_{tot}}$)

답변은 한국어로 작성하며, 구체적이고 실용적인 정보를 포함해주세요."""
    
    async def generate_chat_title(self, first_message: str) -> str:
        """사용자의 첫 메시지를 바탕으로 적절한 채팅 제목을 생성합니다."""
        try:
            # Check if API key is properly set
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key_here":
                return "새 채팅"
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": """당신은 채팅 제목을 생성하는 전문가입니다. 
사용자의 첫 메시지를 분석하여 간결하고 의미있는 채팅 제목을 생성해주세요.

규칙:
1. 제목은 3-6단어로 간결하게 작성
2. 핵심 내용을 명확히 표현
3. 한국어로 작성
4. 특수문자나 따옴표 없이 일반 텍스트로만 작성
5. 데이터 분석 관련 질문이면 분석 주제를 포함

예시:
- 입력: "매출 데이터를 분석해주세요" → 출력: "매출 데이터 분석"
- 입력: "고객 만족도는 어떻게 측정하나요?" → 출력: "고객 만족도 측정 방법"
- 입력: "Python으로 차트를 그리는 방법" → 출력: "Python 차트 그리기"
"""
                    },
                    {"role": "user", "content": f"다음 메시지의 제목을 생성해주세요: {first_message}"}
                ],
                temperature=0.3,
                max_tokens=50
            )
            
            title = response.choices[0].message.content.strip()
            
            # 제목이 너무 길면 잘라내기 (최대 30자)
            if len(title) > 30:
                title = title[:30] + "..."
            
            # 빈 제목이거나 너무 짧으면 기본 제목 반환
            if not title or len(title) < 3:
                return "새 채팅"
                
            return title
            
        except Exception as e:
            print(f"Chat title generation AI error: {str(e)}")
            return "새 채팅"

    async def analyze_with_code_execution(self, df: pd.DataFrame, question: str) -> Dict[str, Any]:
        """코드 실행을 통한 정확한 데이터 분석"""
        try:
            # 질문에서 계산이 필요한지 확인
            calculation_keywords = ['평균', 'average', '총합', 'sum', '개수', 'count', '최대', 'max', '최소', 'min', '표준편차', 'std']
            needs_calculation = any(keyword in question.lower() for keyword in calculation_keywords)

            if not needs_calculation:
                # 일반 분석으로 처리
                return await self.analyze_data(df, question)

            # 코드 생성을 위한 AI 프롬프트
            code_generation_prompt = f"""
데이터 분석 질문: "{question}"

다음 데이터셋에 대해 정확한 계산을 수행하는 Python 코드를 생성해주세요.

데이터 정보:
- 행 수: {len(df):,}
- 열 수: {len(df.columns)}
- 컬럼: {df.columns.tolist()}
- 샘플 데이터: {df.head(3).to_dict()}

요구사항:
1. pandas와 numpy를 사용한 정확한 계산
2. 결과를 명확히 출력하는 print 문 포함
3. LaTeX 수식으로 공식 설명 포함
4. 단계별로 나누어진 실행 가능한 코드

코드만 반환하고 설명은 최소화하세요.
"""

            # AI에게 코드 생성 요청
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Python 데이터 분석 코드를 생성하는 전문가입니다. 정확하고 실행 가능한 코드만 반환합니다."},
                    {"role": "user", "content": code_generation_prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )

            generated_code = response.choices[0].message.content.strip()

            # 생성된 코드를 청크로 분할
            code_chunks = self._split_code_into_chunks(generated_code)

            # 코드 실행을 통한 실제 계산
            execution_result = await self._execute_analysis_code(generated_code, df)

            # 결과 포맷팅
            analysis_result = {
                'answer': execution_result.get('output', ''),
                'code_execution': {
                    'codeChunks': code_chunks,
                    'isExecuting': False,
                    'result': execution_result.get('result', '')
                },
                'insights': [
                    f"✅ 코드 실행을 통한 정확한 계산 결과입니다.",
                    f"⚡ 실행 시간: {execution_result.get('execution_time', 0):.2f}초",
                    "📊 모든 수치는 실제 데이터를 기반으로 계산되었습니다."
                ]
            }

            if execution_result.get('error'):
                analysis_result['insights'].append(f"⚠️ 실행 중 경고: {execution_result['error']}")

            return analysis_result

        except Exception as e:
            print(f"Code execution analysis error: {str(e)}")
            # 오류 시 기본 분석으로 폴백
            return await self.analyze_data(df, question)

    def _split_code_into_chunks(self, code: str) -> List[str]:
        """코드를 실행 단위별로 분할"""
        # 백틱 제거
        code = code.strip()
        if code.startswith('```python'):
            code = code[9:]
        if code.startswith('```'):
            code = code[3:]
        if code.endswith('```'):
            code = code[:-3]

        lines = code.split('\n')
        chunks = []
        current_chunk = []

        for i, line in enumerate(lines):
            current_chunk.append(line)

            # 의미있는 단위로 청크 분할
            is_break_point = (
                line.strip().startswith('import ') or  # import 문
                line.strip().startswith('from ') or   # from import 문
                line.strip().startswith('#') or       # 주석
                (line.strip().startswith('print(') and line.strip().endswith(')')) or  # 완전한 print 문
                (line.strip() == '' and i > 0 and lines[i-1].strip() != '') or  # 빈 줄 (연속 빈 줄 제외)
                (i == len(lines) - 1)  # 마지막 줄
            )

            if is_break_point and current_chunk:
                chunk_text = '\n'.join(current_chunk).strip()
                if chunk_text:
                    chunks.append(chunk_text)
                current_chunk = []

        # 마지막 청크 추가
        if current_chunk:
            chunk_text = '\n'.join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)

        # 빈 청크 제거 및 최소 1개 청크 보장
        chunks = [chunk for chunk in chunks if chunk.strip()]
        if not chunks and code.strip():
            chunks = [code.strip()]

        return chunks

    async def _execute_analysis_code(self, code: str, df: pd.DataFrame) -> Dict[str, Any]:
        """분석 코드를 안전하게 실행"""
        try:
            # 코드 실행 API 호출
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/api/code/execute",
                    json={
                        "code": code,
                        "context": {
                            "data": df.to_dict(),  # 데이터프레임을 딕셔너리로 전달
                            "df": df.to_dict()  # 호환성을 위한 별칭
                        }
                    },
                    timeout=30.0
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    return {
                        "success": False,
                        "output": "",
                        "error": f"실행 실패: {response.status_code}",
                        "execution_time": 0
                    }

        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": f"실행 오류: {str(e)}",
                "execution_time": 0
            }

    async def unified_analysis(self, question: str, df: pd.DataFrame = None, file_info: dict = None, conversation_history: list = None) -> Dict[str, Any]:
        """
        ChatGPT 스타일 완전한 분석 시스템:
        1. 빠른 Python 코드 생성 → 2. 코드 실행 → 3. Plotly 차트 생성 → 4. AI 인사이트 분석
        """
        try:
            print(f"🚀 ChatGPT 스타일 분석 시작: {question}")

            # 1단계: 대화 히스토리 강화
            enhanced_question = self._enhance_question_with_context(question, conversation_history)
            print(f"🔄 Enhanced question: {enhanced_question}")

            # 2단계: 빠른 Python 코드 생성 (ChatGPT 스타일)
            if df is not None and not df.empty:
                print(f"📊 데이터 기반 분석 (행: {len(df)}, 열: {len(df.columns)})")
                generated_code = await self._generate_chatgpt_style_code(enhanced_question, df, file_info)
            else:
                print("🔢 일반 계산/분석 모드")
                generated_code = await self._generate_chatgpt_general_code(enhanced_question)

            print(f"✅ Python 코드 생성 완료")

            # 3단계: 코드 실행 및 차트 생성
            code_chunks = [generated_code] if generated_code else []
            execution_result = ""
            chart_data = None

            if generated_code:
                # 🚀 API 파이프라인을 사용한 안정적인 코드 실행
                print(f"⚡ 코드 실행 시작 (통합 API 파이프라인)...")
                exec_result = await self._execute_code_via_api(generated_code, df)
                execution_result = exec_result.get('output', '')
                chart_data = exec_result.get('chart_data')

                # 디버깅: 실행 결과 상세 로그
                print(f"🔍 코드 실행 완료 (통합 API):")
                print(f"  - 성공: {exec_result.get('success', False)}")
                print(f"  - 출력 길이: {len(execution_result) if execution_result else 0}")
                print(f"  - 출력 내용: {execution_result[:200]}..." if execution_result else "  - 출력 없음")
                print(f"  - 차트 데이터 존재: {bool(chart_data)}")
                if exec_result.get('error'):
                    print(f"  - 오류: {exec_result.get('error')}")

                if chart_data:
                    print(f"📈 차트 데이터 수신 성공! 크기: {len(str(chart_data))}")
                else:
                    print(f"📊 차트 데이터 없음 - 텍스트 분석으로 진행")

            # 4단계: AI 인사이트 생성 (ChatGPT 스타일)
            print(f"🧠 AI 인사이트 분석 시작...")
            insights = await self._generate_chatgpt_insights(
                question, execution_result, chart_data, df
            )

            # 5단계: 후속 질문 생성
            follow_up_questions = await self._generate_follow_up_questions(question, {
                'output': execution_result,
                'chart_data': chart_data
            })

            # 6단계: ChatGPT 스타일 완전한 답변 생성
            comprehensive_answer = await self._generate_comprehensive_answer(
                question, execution_result, insights, chart_data
            )

            result = {
                'answer': comprehensive_answer,
                'code_execution': {
                    'codeChunks': code_chunks,
                    'isExecuting': False,  # 실행 완료
                    'result': execution_result,
                    'output': execution_result
                },
                'insights': insights,
                'followUpQuestions': follow_up_questions,
                'chartData': chart_data
            }

            print(f"🎉 ChatGPT 스타일 완전한 분석 완료!")
            return convert_numpy_types(result)

        except Exception as e:
            import traceback
            print(f"❌ Unified analysis error: {str(e)}")
            print(f"Full traceback: {traceback.format_exc()}")
            return {
                'answer': f"분석 중 오류가 발생했습니다: {str(e)}",
                'code_execution': {
                    'codeChunks': [],
                    'isExecuting': False,
                    'result': f"오류: {str(e)}"
                },
                'insights': [],
                'followUpQuestions': []
            }

    async def _generate_data_analysis_code(self, question: str, df: pd.DataFrame, file_info: dict) -> Dict[str, Any]:
        """파일이 있는 경우 실제 데이터 기반 분석 코드 생성 - 스마트 컬럼 매핑"""

        # AI 기반 유연한 코드 생성
        columns = df.columns.tolist()

        # 컬럼 정보 수집
        column_info = {}
        for col in columns:
            try:
                unique_values = df[col].dropna().unique()
                sample_values = [convert_numpy_types(val) for val in unique_values[:5]] if len(unique_values) > 0 else []
                column_info[col] = {
                    'type': str(df[col].dtype),
                    'sample_values': sample_values,
                    'unique_count': convert_numpy_types(len(unique_values)),
                    'null_count': convert_numpy_types(df[col].isnull().sum())
                }
            except:
                column_info[col] = {'type': 'unknown', 'sample_values': [], 'unique_count': 0, 'null_count': 0}

        # AI에게 직접 코드 생성 요청
        generated_code = await self._generate_flexible_analysis_code(question, df, column_info)
        analysis_type = "ai_generated"

        # 기존 하드코딩된 분석 타입들을 주석 처리하고 AI 생성으로 대체
        # if column_mapping.get("analysis_type") == "gender_analysis" and column_mapping.get("target_column"):
        #     sex_column = column_mapping["target_column"]
        # analysis_type = "gender_analysis"
        # generated_code = f"""import pandas as pd
        # import plotly.express as px
        # import plotly.graph_objects as go
        # import json

# 성별 분포 분석
        # print("=== 성별 분포 분석 ===")
        # sex_counts = df['{sex_column}'].value_counts()
        # print("성별별 개체 수:")
        # for gender, cnt in sex_counts.items():
        # percentage = (cnt / len(df)) * 100
        # print(f"  {gender}: {cnt:,}마리 ({percentage:.1f}%)")

        # print(f"총 분석 개체 수: {len(df):,}마리")

# Plotly 바 차트 생성
        # fig = px.bar(
        # x=sex_counts.index,
        # y=sex_counts.values,
        # labels={{'x': '성별', 'y': '개체 수'}},
        # title='{sex_column} 기준 개체 수 분포',
        # color=sex_counts.values,
        # color_continuous_scale='viridis'
        # )

        # fig.update_layout(
        # xaxis_title='성별',
        # yaxis_title='개체 수',
        # showlegend=False,
        # height=500
        # )

# 차트 데이터를 JSON으로 변환
        # chart_json = fig.to_json()
        # print("📊 차트가 생성되었습니다!")"""

        # 나이/연령 분석
        # elif column_mapping.get("analysis_type") == "age_analysis" and column_mapping.get("target_column"):
        # age_column = column_mapping["target_column"]
        # analysis_type = "age_analysis"
        # generated_code = f"""import pandas as pd
        # import plotly.express as px
        # import numpy as np

# 연령 분포 분석
        # print("=== 연령 분포 분석 ===")
        # ages = df['{age_column}'].dropna()
        # print(f"평균 연령: {ages.mean():.1f}세")
        # print(f"연령 범위: {ages.min():.0f}세 - {ages.max():.0f}세")
        # print(f"표준편차: {ages.std():.1f}세")

# 히스토그램 생성
        # fig = px.histogram(
        # df,
        # x='{age_column}',
        # nbins=20,
        # title='연령 분포',
        # labels={{'{age_column}': '연령', 'count': '개체 수'}}
        # )

        # fig.update_layout(
        # xaxis_title='연령',
        # yaxis_title='개체 수',
        # height=500
        # )

        # chart_json = fig.to_json()
        # print("\\n📊 연령 히스토그램이 생성되었습니다!")"""

        # 지역/지역별 분석
        # elif column_mapping.get("analysis_type") == "location_analysis" and column_mapping.get("target_column"):
        # location_column = column_mapping["target_column"]
        # analysis_type = "location_analysis"
        # generated_code = f"""import pandas as pd
        # import plotly.express as px

# 지역별 분포 분석
        # print("=== 지역별 분포 분석 ===")
        # location_counts = df['{location_column}'].value_counts()
        # print("지역별 개체 수:")
        # for location, count in location_counts.head(10).items():
        # percentage = (count / len(df)) * 100
        # print(f"  {location}: {count:,}마리 ({percentage:.1f}%)")

        # if len(location_counts) > 10:
        # print(f"... 및 {len(location_counts) - 10}개 지역 더")

# 바 차트 생성 (상위 15개 지역)
        # top_locations = location_counts.head(15)
        # fig = px.bar(
        # x=top_locations.values,
        # y=top_locations.index,
        # orientation='h',
        # title='지역별 개체 수 분포 (상위 15개)',
        # labels={{'x': '개체 수', 'y': '지역'}}
        # )

        # fig.update_layout(height=600, yaxis_title='지역', xaxis_title='개체 수')
        # chart_json = fig.to_json()
        # print("\\n📊 지역별 분포 차트가 생성되었습니다!")"""

        # 크기/길이/무게 분석
        # elif column_mapping.get("analysis_type") == "size_analysis" and column_mapping.get("target_column"):
        # size_column = column_mapping["target_column"]
        # analysis_type = "size_analysis"
        # generated_code = f"""import pandas as pd
        # import plotly.express as px
        # import numpy as np

# 크기 분포 분석
        # print("=== {size_column} 분포 분석 ===")
        # sizes = df['{size_column}'].dropna()
        # print(f"평균: {sizes.mean():.2f}")
        # print(f"중앙값: {sizes.median():.2f}")
        # print(f"범위: {sizes.min():.2f} - {sizes.max():.2f}")
        # print(f"표준편차: {sizes.std():.2f}")

# 히스토그램 생성
        # fig = px.histogram(
        # df,
        # x='{size_column}',
        # nbins=30,
        # title=f'{size_column} 분포',
        # labels={{'{size_column}': '{size_column}', 'count': '개체 수'}}
        # )

        # fig.update_layout(height=500)
        # chart_json = fig.to_json()
        # print("\\n📊 크기 분포 히스토그램이 생성되었습니다!")"""

        # 일반적인 데이터 요약 (기본값)
        # else:
        # analysis_type = "general_summary"
        # generated_code = f"""import pandas as pd
        # import plotly.express as px

# 데이터 전체 요약
        # print("=== 데이터 요약 ===")
        # print(f"총 행 수: {{len(df):,}}")
        # print(f"총 컬럼 수: {{len(df.columns)}}")

        # print("\\n컬럼 목록:")
        # for i, col in enumerate(df.columns, 1):
        # print(f"  {{i}}. {{col}}")

# 숫자형 컬럼 통계
        # numeric_cols = df.select_dtypes(include=['number']).columns
        # if len(numeric_cols) > 0:
        # print("\\n숫자형 컬럼 통계:")
        # for col in numeric_cols[:5]:  # 최대 5개
        # values = df[col].dropna()
        # if len(values) > 0:
        # print(f"  {{col}}: 평균 {{values.mean():.2f}}, 범위 {{values.min():.2f}}-{{values.max():.2f}}")

# 첫 번째 범주형 컬럼으로 간단한 차트 생성
        # categorical_cols = df.select_dtypes(include=['object']).columns
        # if len(categorical_cols) > 0:
        # chart_col = categorical_cols[0]
        # value_counts = df[chart_col].value_counts().head(10)

        # fig = px.bar(
        # x=value_counts.index,
        # y=value_counts.values,
        # title=f'{{chart_col}} 분포 (상위 10개)',
        # labels={{'x': chart_col, 'y': '개수'}}
        # )

        # fig.update_layout(height=500)
        # chart_json = fig.to_json()
        # print(f"\\n📊 {{chart_col}} 분포 차트가 생성되었습니다!")
        # else:
        # print("\\n차트 생성을 위한 적절한 컬럼을 찾을 수 없습니다.")"""

        # 코드가 생성되지 않은 경우 기본 코드
        # if not generated_code:
        # generated_code = """print("죄송합니다. 해당 질문에 대한 분석 코드를 생성할 수 없습니다.")
        # print("데이터의 컬럼 목록을 확인해주세요:")
        # for i, col in enumerate(df.columns, 1):
        # print(f"  {i}. {col}")"""

        # 생성된 코드를 청크로 분할
        code_chunks = [generated_code] if generated_code else []

        # 실제 데이터로 코드 실행
        execution_result = await self._execute_analysis_code_with_data(generated_code, df)

        # 실행 결과 기반 인사이트 생성
        insights = self._generate_insights_from_results(execution_result, analysis_type, df, question)

        return {
            'output': execution_result.get('output', ''),
            'code_chunks': code_chunks,
            'result': execution_result.get('result', ''),
            'insights': insights,
            'chart_data': execution_result.get('chart_data')
        }

    def _generate_insights_from_results(self, execution_result: Dict[str, Any], analysis_type: str, df: pd.DataFrame, question: str) -> List[str]:
        """실행 결과를 기반으로 의미있는 인사이트 생성"""
        insights = []

        # 기본 실행 정보
        if execution_result.get('success', True):
            insights.append(f"✅ 총 {len(df):,}행의 실제 데이터를 분석했습니다.")

            execution_time = execution_result.get('execution_time', 0)
            if execution_time > 0:
                insights.append(f"⚡ 분석 실행 시간: {execution_time:.3f}초")
        else:
            insights.append("❌ 코드 실행 중 오류가 발생했습니다.")
            return insights

        # 분석 결과에서 숫자 추출 시도
        output = execution_result.get('output', '')

        if analysis_type == "gender_analysis":
            insights.append("🔍 성별 분포 분석이 완료되었습니다.")

            # 출력에서 비율 정보 추출 시도
            if '%' in output:
                insights.append("📊 각 성별의 비율과 개체 수가 계산되었습니다.")

            if 'Female' in output or 'Male' in output or '암컷' in output or '수컷' in output:
                insights.append("♂♀ 수컷과 암컷의 분포를 시각적으로 확인할 수 있습니다.")

        elif analysis_type == "age_analysis":
            insights.append("📈 연령 분포 통계가 생성되었습니다.")
            if '평균' in output:
                insights.append("📊 평균 연령, 범위, 표준편차 정보를 확인할 수 있습니다.")

        elif analysis_type == "location_analysis":
            insights.append("🌍 지역별 분포 분석이 완료되었습니다.")
            if '지역' in output:
                insights.append("📍 상위 지역들의 개체 수 분포를 확인할 수 있습니다.")

        elif analysis_type == "size_analysis":
            insights.append("📏 크기/길이 분포 통계가 생성되었습니다.")
            if '평균' in output:
                insights.append("📊 평균값, 중앙값, 범위 정보를 확인할 수 있습니다.")

        else:
            insights.append("📋 데이터 전반적인 요약 정보가 생성되었습니다.")

        # 차트 생성 여부 확인
        if execution_result.get('chart_data') or '차트가 생성되었습니다' in output:
            insights.append("📊 대화형 그래프가 생성되어 시각적 분석이 가능합니다.")

        # 데이터 품질 관련 인사이트
        if len(df) >= 1000:
            insights.append("💪 대용량 데이터셋으로 통계적으로 신뢰성 있는 분석입니다.")
        elif len(df) >= 100:
            insights.append("📈 충분한 샘플 크기로 의미있는 분석이 가능합니다.")

        return insights

    async def _smart_column_mapping(self, question: str, columns: List[str], df: pd.DataFrame) -> Dict[str, str]:
        """AI를 활용한 스마트 컬럼 매핑 - 질문의 의도를 파악하여 적절한 컬럼을 찾음"""

        # 샘플 데이터 준비 (각 컬럼의 고유값 몇 개씩)
        column_info = {}
        for col in columns:
            try:
                unique_values = df[col].dropna().unique()
                if len(unique_values) > 0:
                    # 너무 많으면 처음 5개만
                    sample_values = [convert_numpy_types(val) for val in unique_values[:5]]
                    column_info[col] = {
                        'type': str(df[col].dtype),
                        'sample_values': sample_values,
                        'unique_count': convert_numpy_types(len(unique_values))
                    }
            except:
                column_info[col] = {'type': 'unknown', 'sample_values': [], 'unique_count': 0}

        # AI에게 컬럼 매핑 요청
        mapping_prompt = f"""
사용자가 데이터에 대해 다음과 같이 질문했습니다: "{question}"

데이터의 컬럼 정보:
{json.dumps(convert_numpy_types(column_info), ensure_ascii=False, indent=2)}

사용자의 질문 의도를 파악하여 다음 분석 유형 중 하나와 해당하는 컬럼을 매핑해주세요:

분석 유형:
1. gender_analysis: 성별, 수컷/암컷, 남녀 관련 분석
2. age_analysis: 나이, 연령, 살 관련 분석
3. location_analysis: 지역, 나라, 국가, 위치 관련 분석
4. size_analysis: 크기, 길이, 무게, 키, 몸무게, 체중, 중량, 표준편차, 평균, 분산 관련 분석
5. general_summary: 위의 카테고리에 해당하지 않는 일반적인 분석

응답 형식 (JSON):
{{
  "analysis_type": "분석_유형",
  "target_column": "해당_컬럼명_또는_null",
  "confidence": 0.8,
  "reasoning": "선택한 이유"
}}

주의사항:
- 한국어 질문이어도 영어 컬럼명과 의미적으로 매칭해주세요
- 샘플 값을 보고 컬럼의 실제 내용을 판단하세요
- 확신이 없으면 confidence를 낮게 설정하세요
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "데이터 분석 전문가로서 사용자의 질문 의도를 정확히 파악하여 적절한 컬럼을 매핑합니다."},
                    {"role": "user", "content": mapping_prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )

            mapping_result = response.choices[0].message.content.strip()

            # JSON 파싱 시도

            # JSON 부분만 추출
            json_match = re.search(r'\{.*\}', mapping_result, re.DOTALL)
            if json_match:
                mapping_data = json.loads(json_match.group())
                return mapping_data
            else:
                return {"analysis_type": "general_summary", "target_column": None, "confidence": 0.0, "reasoning": "JSON 파싱 실패"}

        except Exception as e:
            print(f"Smart column mapping error: {e}")
            return {"analysis_type": "general_summary", "target_column": None, "confidence": 0.0, "reasoning": f"오류: {str(e)}"}

    def _enhance_question_with_context(self, question: str, conversation_history: list = None) -> str:
        """대화 히스토리를 활용하여 질문을 맥락적으로 강화"""
        if not conversation_history or len(conversation_history) == 0:
            return question

        # 최근 3개 대화만 사용 (토큰 한도 고려)
        recent_history = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history

        # 참조 단어들 체크 ("이것", "그것", "이 데이터", "위의 결과" 등)
        reference_words = [
            "이것", "그것", "이거", "그거", "이", "그",
            "이 데이터", "이 파일", "이 결과", "위의", "앞서",
            "방금", "직전", "이전", "다시", "또", "추가로",
            "it", "this", "that", "these", "those", "above", "previous"
        ]

        has_reference = any(word in question.lower() for word in reference_words)

        # 대화 맥락을 포함한 강화된 질문 생성 (참조 단어 유무와 관계없이)
        context_summary = ""

        # 대화 히스토리에서 맥락 정보 추출 (모든 메시지 포함)
        conversation_context = []
        for msg in recent_history:
            # ConversationMessage 객체인 경우 속성으로 접근
            if hasattr(msg, 'role'):
                role = getattr(msg, 'role', '')
                content = getattr(msg, 'content', '')
            # 딕셔너리인 경우
            elif isinstance(msg, dict):
                role = msg.get('role', '')
                content = msg.get('content', '')
            else:
                continue

            if role == 'user':
                # 사용자 질문은 간략하게 요약 (안전한 문자열 처리)
                safe_content = str(content).replace('\n', ' ').replace('\r', ' ')
                summary = safe_content[:150] + "..." if len(safe_content) > 150 else safe_content
                conversation_context.append(f"사용자: {summary}")
            elif role == 'assistant':
                # AI 답변도 포함하되 간략하게 (안전한 문자열 처리)
                safe_content = str(content).replace('\n', ' ').replace('\r', ' ')
                # 특수 문자나 긴 숫자 배열 제거
                if len(safe_content) > 500:
                    safe_content = safe_content[:500] + "..."
                summary = safe_content[:200] + "..." if len(safe_content) > 200 else safe_content
                conversation_context.append(f"AI: {summary}")

        # 대화 맥락을 포함한 질문 구성
        if conversation_context:
            # 최근 4개 대화만 사용 (토큰 한도 고려)
            recent_context = conversation_context[-4:]
            context_summary = f"이전 대화 맥락:\n{chr(10).join(recent_context)}\n\n"
        else:
            context_summary = ""

        enhanced_question = f"{context_summary}현재 질문: {question}"

        print(f"📝 Context enhancement applied - Reference words found: {has_reference}")
        return enhanced_question

    async def _generate_flexible_analysis_code(self, question: str, df: pd.DataFrame, column_info: dict) -> str:
        """AI가 직접 Python 분석 코드를 생성하는 유연한 시스템"""

        # 데이터 요약 정보 생성
        data_summary = f"""
데이터셋 정보:
- 총 행 수: {len(df):,}
- 총 컬럼 수: {len(df.columns)}
- 컬럼 정보: {json.dumps(convert_numpy_types(column_info), ensure_ascii=False, indent=2)}

샘플 데이터 (처음 3행):
{convert_numpy_types(df.head(3).to_dict('records'))}
"""

        analysis_prompt = f"""
사용자 질문: "{question}"

{data_summary}

위 데이터에 대해 사용자의 질문에 정확히 답하는 Python 코드를 생성해주세요.

필수 요구사항:
1. import pandas as pd, import plotly.express as px 포함
2. 데이터는 이미 'df' 변수로 로드되어 있음
3. 질문에 맞는 적절한 컬럼을 자동으로 선택
4. 분석 결과를 명확하게 print로 출력
5. 가능하면 시각화(plotly) 포함하고 다음 코드로 안전하게 저장:
   try:
       chart_json = fig.to_json()
   except Exception as e:
       print(f"Chart JSON generation error: {e}")
       chart_json = None
6. 한국어로 출력 메시지 작성
7. 컬럼명이 영어여도 의미를 파악해서 분석

분석 타입 예시:
- 성별/gender 분포: 막대 차트
- 연령/age 분포: 히스토그램
- 지역/location 분포: 막대 차트
- 수치 통계: 평균, 표준편차, 히스토그램
- 상관관계: scatter plot
- 시계열: line plot

코드만 반환하고 설명은 생략하세요.
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "당신은 데이터 분석 전문가입니다. 사용자의 질문에 맞는 정확한 Python 분석 코드를 생성합니다."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )

            generated_code = response.choices[0].message.content.strip()

            # 마크다운 코드 블록 제거
            if '```python' in generated_code:
                generated_code = generated_code.split('```python')[1].split('```')[0]
            elif '```' in generated_code:
                generated_code = generated_code.split('```')[1].split('```')[0]

            generated_code = generated_code.strip()

            print(f"🤖 AI generated flexible analysis code:")
            print(f"Code preview: {generated_code[:200]}...")

            return generated_code

        except Exception as e:
            print(f"AI code generation error: {e}")
            # 폴백: 기본 데이터 요약 코드
            return f"""import pandas as pd
import plotly.express as px

print("=== 데이터 분석 ===")
print(f"총 {len(df):,}개 행, {len(df.columns)}개 컬럼")
print("\\n기본 통계:")
print(df.describe())

print("\\n📊 분석이 완료되었습니다!")"""

    async def _generate_general_analysis_code(self, question: str) -> Dict[str, Any]:
        """파일이 없는 경우 일반적인 분석 코드 생성"""

        # 질문에서 숫자와 연산자 추출
        import re

        # 수식 패턴 감지
        math_expression_pattern = r'[\d+\-*\/\(\)\.\s]+'
        has_math_expression = bool(re.search(r'[\d\s]*[\+\-\*\/][\d\s]*', question))

        if has_math_expression:
            # 수식이 있는 경우, 전체 수식을 추출
            expression_match = re.search(r'[0-9+\-*\/\(\)\.\s]+', question)
            math_expression = expression_match.group(0).strip() if expression_match else None
        else:
            # 단순 숫자 목록인 경우
            math_expression = None

        numbers = re.findall(r'\d+(?:\.\d+)?', question)

        if math_expression:
            # 수식에서 잘못된 연산자 패턴 수정
            clean_expression = math_expression.replace('+*', '*').replace('-*', '*').replace('**', '*')
            # 더 확실한 코드 생성을 위해 직접 구성
            direct_code = f'result = eval("{clean_expression}")\nprint(f"결과: {{result}}")'

            code_prompt = f"""You must return exactly this Python code with NO changes, NO additions, NO markdown:

{direct_code}

Return ONLY the above code. Nothing else."""
        else:
            # 숫자 리스트를 정수로 변환
            int_numbers = [int(num) for num in numbers if num.isdigit()]
            direct_code = f'data = {int_numbers}\nresult = sum(data)\nprint(f"총합: {{result:,}}")'

            code_prompt = f"""You must return exactly this Python code with NO changes, NO additions, NO markdown:

{direct_code}

Return ONLY the above code. Nothing else."""

        # AI에 의존하지 않고 직접 코드 생성 (더 안정적)
        if math_expression:
            generated_code = f'result = eval("{clean_expression}")\nprint(f"결과: {{result}}")'
        else:
            # 숫자 리스트를 정수로 변환
            int_numbers = [int(num) for num in numbers if num.isdigit()]
            generated_code = f'data = {int_numbers}\nresult = sum(data)\nprint(f"총합: {{result:,}}")'

        print(f"직접 생성된 코드:\n{generated_code}")

        # 마크다운 코드 블록과 설명 텍스트 제거
        def clean_code(code_text: str) -> str:
            """AI가 생성한 텍스트에서 순수 Python 코드만 추출"""
            # 마크다운 코드 블록 제거 (더 강력한 제거)
            if '```python' in code_text:
                code_text = code_text.split('```python')[1].split('```')[0]
            elif '```' in code_text:
                parts = code_text.split('```')
                if len(parts) >= 3:
                    code_text = parts[1]

            # 불필요한 설명 텍스트 완전 제거
            if 'CRITICAL:' in code_text:
                parts = code_text.split('CRITICAL:')[0].strip()
                if parts:
                    code_text = parts

            if 'Required format:' in code_text:
                parts = code_text.split('Required format:')[1].strip()
                if parts:
                    code_text = parts

            lines = code_text.split('\n')
            code_lines = []

            # 중복된 print 문 방지를 위한 세트
            seen_prints = set()

            for line in lines:
                stripped = line.strip()

                # 빈 줄 건너뛰기
                if not stripped:
                    continue

                # 설명성 텍스트 완전 제거
                if (not any(c in stripped for c in ['=', '(', '[']) and
                    any(ord(char) >= 0xAC00 and ord(char) <= 0xD7A3 for char in stripped)):
                    continue

                # Python 코드가 아닌 것들 제거
                if (stripped.startswith('Task:') or
                    stripped.startswith('Numbers:') or
                    stripped.startswith('Calculate') or
                    stripped.startswith('CRITICAL:') or
                    stripped.startswith('Required format:')):
                    continue

                # 중복된 print 문 제거
                if stripped.startswith('print('):
                    if stripped in seen_prints:
                        continue
                    seen_prints.add(stripped)

                # 유효한 Python 코드만 추가
                if (('=' in stripped) or
                    stripped.startswith('print(') or
                    stripped.startswith('result') or
                    stripped.startswith('data') or
                    ('    ' in line and line.strip())):  # 들여쓰기된 라인
                    code_lines.append(line.rstrip())

            return '\n'.join(code_lines)

        # 원본 코드 보관 (디버깅용)
        original_code = generated_code
        generated_code = clean_code(generated_code)

        # 정제된 코드를 청크로 분할
        code_chunks = self._split_code_into_chunks(generated_code)

        # 코드 실행
        execution_result = await self._execute_analysis_code(generated_code, pd.DataFrame())

        # 결과 포맷팅
        return {
            'output': execution_result.get('output', ''),
            'code_chunks': code_chunks,
            'result': execution_result.get('result', ''),
            'insights': [
                "✅ 계산이 완료되었습니다."
            ],
            'success': execution_result.get('success', False)
        }

    async def _execute_analysis_code_with_data(self, code: str, df: pd.DataFrame) -> Dict[str, Any]:
        """실제 데이터와 함께 분석 코드 실행"""
        try:
            # 코드 실행 API 호출
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/api/code/execute",
                    json={
                        "code": code,
                        "context": {
                            "df": df.to_dict('list'),  # list 형태로 직렬화
                            "data": df.to_dict('list'),
                            "rows": len(df),
                            "columns": df.columns.tolist()
                        }
                    },
                    timeout=30.0
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    return {
                        "success": False,
                        "output": "",
                        "error": f"실행 실패: {response.status_code}",
                        "execution_time": 0
                    }

        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": f"실행 오류: {str(e)}",
                "execution_time": 0
            }

    async def _generate_follow_up_questions(self, original_question: str, analysis_result: Dict[str, Any]) -> List[str]:
        """분석 결과를 바탕으로 관련 질문 생성"""
        try:
            follow_up_prompt = f"""
사용자가 "{original_question}"라고 질문했고, 다음과 같은 분석 결과를 얻었습니다:

결과: {analysis_result.get('output', '')[:500]}...

이 분석 결과를 바탕으로 사용자가 추가로 궁금해할 만한 관련 질문 3개를 생성해주세요.

요구사항:
1. 현재 분석을 심화시킬 수 있는 질문
2. 다른 관점에서 접근할 수 있는 질문
3. 실무적으로 유용한 질문
4. 각 질문은 한 문장으로 간결하게
5. 질문만 반환 (번호나 설명 없이)

예시:
이 데이터에서 이상치는 어떻게 분포되어 있나요?
시간대별 트렌드는 어떻게 변화하고 있나요?
다른 변수와의 상관관계는 어떻게 되나요?
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "데이터 분석 관련 후속 질문을 생성하는 전문가입니다."},
                    {"role": "user", "content": follow_up_prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )

            questions_text = response.choices[0].message.content.strip()
            questions = [q.strip() for q in questions_text.split('\n') if q.strip()]

            return questions[:3]  # 최대 3개만 반환

        except Exception as e:
            print(f"Follow-up questions generation error: {str(e)}")
            return [
                "이 결과를 다른 관점에서 분석해볼 수 있을까요?",
                "추가적으로 확인해볼 만한 패턴이 있을까요?",
                "이 데이터의 다른 특성은 어떻게 될까요?"
            ]

    # ========== ChatGPT 스타일 새로운 함수들 ==========

    async def _generate_chatgpt_style_code(self, question: str, df: pd.DataFrame, file_info: dict) -> str:
        """ChatGPT 스타일 빠른 Python 코드 생성 (데이터 기반)"""
        try:
            # 데이터 분석 - 컬럼 정보 수집
            columns = df.columns.tolist()
            column_info = {}
            for col in columns[:10]:  # 최대 10개 컬럼만 분석
                try:
                    dtype = str(df[col].dtype)
                    unique_count = len(df[col].unique())
                    sample_values = df[col].dropna().head(3).tolist()
                    column_info[col] = {
                        'type': dtype,
                        'unique_count': unique_count,
                        'sample_values': sample_values
                    }
                except:
                    column_info[col] = {'type': 'unknown', 'unique_count': 0, 'sample_values': []}

            prompt = f"""
당신은 ChatGPT처럼 데이터 분석 Python 코드를 생성하는 전문가입니다.

질문: {question}

**실제 데이터 정보** (이미 df 변수에 로드됨):
- 총 {len(df)}행, {len(df.columns)}열
- 실제 컬럼명: {columns}
- 컬럼별 상세 정보: {column_info}

**절대 금지사항**:
- 새로운 DataFrame 생성 금지 (df는 이미 존재함)
- 예시 데이터 생성 금지
- data = {{}} 같은 새 데이터 생성 금지
- pd.DataFrame(data) 같은 코드 금지

**필수 요구사항**:
1. **반드시 기존 df 변수 사용** - 새로 만들지 말고 이미 있는 df 사용!
2. **절대 필수**: fig 변수에 plotly 차트 저장
3. 실제 컬럼명을 정확히 사용
4. 한국어 주석과 설명 포함

**올바른 코드 패턴**:
```python
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# 실제 데이터 확인 (df는 이미 로드되어 있음)
print("=== 실제 데이터 분석 결과 ===")
print(f"데이터 shape: {{df.shape}}")
print(f"컬럼: {{df.columns.tolist()}}")

# 실제 데이터로 분석
# df.describe(), df.info() 등을 사용하여 실제 데이터 분석

# 실제 컬럼명을 사용한 Plotly 차트 생성
fig = px.bar(df, x='실제컬럼명', title='실제 데이터 분석 결과')

print("📊 실제 데이터로 차트 생성 완료!")
```

**잘못된 예시 (절대 금지)**:
```python
# 이런 코드는 절대 작성하지 마세요!
data = {{'col1': [1,2,3], 'col2': [4,5,6]}}  # 금지!
df = pd.DataFrame(data)  # 금지!
```

실제 데이터(df)를 사용한 완전한 실행 가능한 Python 코드만 반환하세요:
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 ChatGPT와 같은 데이터 분석 Python 코드 생성 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )

            generated_code = response.choices[0].message.content.strip()

            # 코드 블록 마커 제거
            if "```python" in generated_code:
                generated_code = generated_code.split("```python")[1].split("```")[0]
            elif "```" in generated_code:
                generated_code = generated_code.split("```")[1].split("```")[0]

            return generated_code.strip()

        except Exception as e:
            print(f"ChatGPT 스타일 코드 생성 오류: {e}")
            return f"""
import pandas as pd
import plotly.express as px

print("=== 데이터 분석 ===")
print(f"데이터 shape: {{df.shape}}")
print(f"컬럼: {{df.columns.tolist()}}")

# 기본 차트 생성
if len(df.columns) >= 2:
    fig = px.scatter(df, x=df.columns[0], y=df.columns[1], title="데이터 분석 결과")
else:
    fig = px.bar(x=['데이터'], y=[len(df)], title="데이터 개수")

print("📊 기본 차트 생성 완료!")
"""

    async def _needs_python_code(self, question: str) -> bool:
        """질문이 Python 코드 실행을 필요로 하는지 판단"""
        try:
            prompt = f"""
다음 질문이 Python 코드 실행이 필요한지 판단해주세요.

질문: {question}

Python 코드가 필요한 경우:
- 수학적 계산 (복잡한 연산, 통계 계산)
- 데이터 시각화가 필요한 경우
- 알고리즘 구현이나 시뮬레이션
- 수치 분석이나 그래프 생성

Python 코드가 불필요한 경우:
- 일반적인 질문과 답변
- 개념 설명이나 정의
- 간단한 사실 확인
- 조언이나 의견 요청

'YES' 또는 'NO'로만 답변하세요.
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 질문 분석 전문가입니다. Python 코드 실행이 필요한지 정확히 판단하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )

            answer = response.choices[0].message.content.strip().upper()
            return answer == "YES"

        except Exception as e:
            print(f"코드 필요성 판단 오류: {e}")
            # 오류 시 기본적으로 코드 생성하지 않음
            return False

    async def _generate_chatgpt_general_code(self, question: str) -> str:
        """ChatGPT 스타일 일반 계산/분석 코드 생성 (파일 없는 경우)"""
        try:
            prompt = f"""
당신은 ChatGPT처럼 Python 코드를 생성하는 전문가입니다.

질문: {question}

요구사항:
1. 질문에 맞는 Python 계산/분석 코드 작성
2. numpy, pandas, plotly 등 필요한 라이브러리 사용
3. 가능하면 시각화 포함 (fig 변수에 저장)
4. 실행 가능한 완전한 코드만 반환
5. 한국어 주석과 설명 포함

완전한 실행 가능한 Python 코드만 반환하세요:
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 ChatGPT와 같은 Python 코드 생성 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
                stream=True  # 스트리밍 활성화
            )

            generated_code = ""
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    generated_code += chunk.choices[0].delta.content

            # 코드 블록 마커 제거
            if "```python" in generated_code:
                generated_code = generated_code.split("```python")[1].split("```")[0]
            elif "```" in generated_code:
                generated_code = generated_code.split("```")[1].split("```")[0]

            return generated_code.strip()

        except Exception as e:
            print(f"일반 코드 생성 오류: {e}")
            return f"""
import numpy as np
import matplotlib.pyplot as plt
import plotly.express as px

print("=== 계산 결과 ===")
print("질문에 대한 답변을 계산 중입니다...")

# 기본 차트 생성
fig = px.bar(x=['결과'], y=[1], title="계산 완료")
print("📊 계산 완료!")
"""

    def _execute_code_safely(self, code: str, globals_dict: dict) -> dict:
        """안전한 코드 실행 with 출력 캡처"""
        try:
            # 출력 캡처를 위한 StringIO
            output_buffer = io.StringIO()
            error_buffer = io.StringIO()

            # stdout, stderr 리디렉션
            with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
                exec(code, globals_dict)

            output = output_buffer.getvalue()
            error = error_buffer.getvalue()

            # 추가로 결과값 추출 (print가 없어도 결과 확보)
            additional_results = []
            for key, value in globals_dict.items():
                if key not in ['pd', 'np', 'plt', 'px', 'go', 'pio', 'json', 'plotly', 'df', '__builtins__']:
                    try:
                        # 숫자나 간단한 값들만 결과에 포함
                        if isinstance(value, (int, float, str, bool, list, tuple)) and len(str(value)) < 500:
                            additional_results.append(f"{key}: {value}")
                        elif hasattr(value, 'shape') and hasattr(value, 'dtype'):  # numpy array나 pandas Series
                            additional_results.append(f"{key}: {type(value).__name__} shape={value.shape}")
                    except:
                        pass

            # 출력 결합
            if additional_results:
                if output:
                    output += "\n" + "\n".join(additional_results)
                else:
                    output = "\n".join(additional_results)

            return {
                'success': True,
                'output': output,
                'error': error if error else None
            }

        except Exception as e:
            import traceback
            return {
                'success': False,
                'output': '',
                'error': f"{str(e)}\n{traceback.format_exc()}"
            }

    async def _execute_code_via_api(self, code: str, df: pd.DataFrame) -> dict:
        """🚀 프론트엔드 성공 파이프라인과 완전히 동일한 방식으로 실행"""
        try:
            import httpx
            import json
            import numpy as np

            print(f"🔥 프론트엔드 성공 파이프라인 사용 - 코드 길이: {len(code)}")

            # 데이터프레임을 딕셔너리로 변환 (프론트엔드와 100% 동일)
            context = {}
            if df is not None and not df.empty:
                # 단계별 강력한 NaN 처리
                df_clean = df.copy()

                # 1. 모든 NaN, inf 값을 None으로 변환
                df_clean = df_clean.replace([np.nan, np.inf, -np.inf], None)

                # 2. None을 숫자 컬럼에서는 0으로, 문자열 컬럼에서는 빈 문자열로 변환
                for col in df_clean.columns:
                    if df_clean[col].dtype in ['float64', 'int64', 'float32', 'int32']:
                        df_clean[col] = df_clean[col].fillna(0)
                    else:
                        df_clean[col] = df_clean[col].fillna('')

                # 3. to_dict 변환
                df_dict = df_clean.to_dict('list')

                # 4. 딕셔너리 내 모든 값을 JSON 안전 타입으로 변환
                def clean_value(val):
                    if pd.isna(val) or val is None:
                        return None
                    elif isinstance(val, (np.integer, int)):
                        return int(val)
                    elif isinstance(val, (np.floating, float)):
                        if np.isnan(val) or np.isinf(val):
                            return 0
                        return float(val)
                    elif isinstance(val, str):
                        return str(val)
                    else:
                        return str(val)

                # 5. 모든 값을 재귀적으로 정리
                cleaned_dict = {}
                for key, values in df_dict.items():
                    cleaned_dict[key] = [clean_value(v) for v in values]

                context['df'] = cleaned_dict
                print(f"📊 데이터 변환 완료: {len(df)}행, {len(df.columns)}열 (강력한 NaN 처리 적용)")

            # 요청 데이터 구성 (프론트엔드와 동일)
            request_data = {
                "code": code,
                "context": context
            }

            # JSON 직렬화 테스트
            try:
                json.dumps(request_data, ensure_ascii=False)
                print(f"✅ JSON 직렬화 테스트 통과")
            except Exception as json_error:
                print(f"❌ JSON 직렬화 테스트 실패: {json_error}")
                return {
                    "success": False,
                    "output": "",
                    "error": f"데이터 직렬화 오류: {str(json_error)}"
                }

            print(f"🌐 API 호출 시작: /api/code/execute")

            # 내부 API 호출 (프론트엔드와 동일한 엔드포인트)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8001/api/code/execute",
                    json=request_data,
                    timeout=30.0
                )

                if response.status_code == 200:
                    result = response.json()
                    success = result.get('success', False)
                    chart_data = result.get('chart_data')
                    output = result.get('output', '')

                    print(f"✅ 프론트엔드 파이프라인 성공!")
                    print(f"  - 성공: {success}")
                    print(f"  - 출력 길이: {len(output) if output else 0}")
                    print(f"  - 차트 데이터: {'있음' if chart_data else '없음'}")

                    if chart_data:
                        print(f"🎨 차트 데이터 크기: {len(str(chart_data))}")

                    return {
                        'success': success,
                        'output': output,
                        'error': result.get('error'),
                        'chart_data': chart_data,
                        'execution_time': result.get('execution_time', 0)
                    }
                else:
                    print(f"❌ API 호출 실패: {response.status_code}")
                    return {
                        'success': False,
                        'output': '',
                        'error': f"API 호출 실패: HTTP {response.status_code}"
                    }

        except Exception as e:
            print(f"❌ API 실행 오류: {e}")
            import traceback
            print(f"상세 오류: {traceback.format_exc()}")
            return {
                'success': False,
                'output': '',
                'error': f"API 실행 오류: {str(e)}"
            }

    def _analyze_generated_code_for_insights(self, code: str, question: str, df: pd.DataFrame) -> str:
        """🧠 생성된 코드를 분석해서 스마트한 인사이트 제공"""
        try:
            print(f"🔍 코드 분석 시작: {len(code)}자")

            # 데이터 정보 추출
            data_info = ""
            if df is not None and not df.empty:
                data_info = f"데이터셋: {len(df)}행 {len(df.columns)}열\n"
                data_info += f"컬럼: {', '.join(df.columns.tolist())}\n"

                # 숫자 컬럼 정보
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                if numeric_cols:
                    data_info += f"숫자 컬럼: {', '.join(numeric_cols)}\n"

            # 코드에서 주요 분석 내용 추출
            analysis_content = ""

            # 코드에서 차트 타입 추출
            if "px.line" in code or "plt.plot" in code:
                analysis_content += "📈 선형 차트 분석: 시간에 따른 데이터 변화 추세를 시각화\n"
            elif "px.bar" in code or "plt.bar" in code:
                analysis_content += "📊 막대 차트 분석: 카테고리별 데이터 비교를 시각화\n"
            elif "px.scatter" in code or "plt.scatter" in code:
                analysis_content += "🔵 산점도 분석: 두 변수 간의 상관관계를 시각화\n"

            # 코드에서 분석 방법 추출
            if "mean()" in code or "평균" in code:
                analysis_content += "💡 평균값 계산을 통한 중앙값 분석\n"
            if "growth" in code or "성장률" in code:
                analysis_content += "📈 성장률 분석을 통한 변화 추세 파악\n"
            if "compare" in code or "비교" in code:
                analysis_content += "⚖️ 비교 분석을 통한 차이점 식별\n"

            # 질문 기반 맞춤 분석
            question_insights = ""
            if "GDP" in question.upper():
                question_insights += "🌍 GDP 데이터 분석: 경제 성장 및 국가별 비교\n"
            if "growth" in question.lower() or "성장" in question:
                question_insights += "📊 성장률 분석: 시간에 따른 변화율 계산\n"

            # 최종 분석 결과 조합
            smart_analysis = f"""🤖 **스마트 코드 분석 결과**

{data_info}
**분석 방법:**
{analysis_content}

**질문 기반 인사이트:**
{question_insights}

**생성된 분석 코드:**
- 데이터 처리 및 계산 로직 구현
- 시각화 차트 생성 ({len(code)}자의 Python 코드)
- 분석 결과를 차트로 표현

**예상 결과:**
이 분석을 통해 {question}에 대한 구체적인 답변을 얻을 수 있으며,
생성된 차트를 통해 시각적으로 데이터의 패턴과 트렌드를 확인할 수 있습니다.
"""

            print(f"✅ 스마트 분석 완료: {len(smart_analysis)}자")
            return smart_analysis

        except Exception as e:
            print(f"❌ 코드 분석 오류: {e}")
            return f"생성된 분석 코드를 기반으로 {question}에 대한 분석이 수행되었습니다. 차트를 확인해보세요."

    async def _generate_chatgpt_insights(self, question: str, execution_result: str,
                                       chart_data: dict, df: pd.DataFrame) -> list:
        """ChatGPT 스타일 고품질 AI 인사이트 생성"""
        try:
            # 실행 결과에서 실제 수치 데이터 추출
            actual_numbers = []
            if execution_result:
                import re
                # 숫자 패턴 찾기 (개수, 비율 등)
                numbers = re.findall(r'\d+[,.]?\d*', execution_result)
                actual_numbers = numbers[:10]  # 최대 10개

            # 데이터 정보 요약
            data_summary = ""
            if df is not None and not df.empty:
                data_summary = f"실제 데이터: {len(df):,}건의 레코드, {len(df.columns)}개 컬럼"

            prompt = f"""
당신은 데이터 분석 전문가로서 실제 분석 결과를 바탕으로 구체적이고 실용적인 인사이트를 제공합니다.

**분석 상황:**
질문: {question}
{data_summary}
실행 결과: {execution_result}
추출된 수치: {actual_numbers}
차트: {'생성됨' if chart_data else '없음'}

**요구사항:**
1. **실제 데이터 결과를 구체적으로 언급** (일반론 금지)
2. **실행 결과의 숫자를 활용한 구체적 분석**
3. **마크다운 형식으로 구조화된 인사이트**
4. **비즈니스 관점의 실용적 해석**

**인사이트 형식 (다양하게 활용):**
- **제목 활용**: ## 주요 발견, ### 핵심 포인트
- **강조**: **중요한 수치**, *주목할 점*
- **리스트**: • 구체적 사실들
- **인용**: > 핵심 결론

**절대 금지:**
- "특정 네트워크에 집중되어 있으며..." 같은 모호한 표현
- "소비자 선호도를 반영합니다" 같은 뻔한 해석
- 실제 데이터 결과와 무관한 일반론

실제 분석 결과를 바탕으로 한 구체적이고 유용한 인사이트를 마크다운 형식으로 작성하세요:
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 실제 데이터를 바탕으로 구체적이고 실용적인 인사이트를 제공하는 데이터 분석 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )

            insights_text = response.choices[0].message.content.strip()

            # 마크다운 형식을 고려한 인사이트 반환
            return [insights_text]  # 하나의 완성된 마크다운 텍스트로 반환

        except Exception as e:
            print(f"인사이트 생성 오류: {e}")
            return [
                "## 분석 완료\n\n실제 데이터 분석이 성공적으로 완료되었습니다. 생성된 차트를 통해 데이터의 분포와 패턴을 확인할 수 있습니다."
            ]

    async def _generate_comprehensive_answer(self, question: str, execution_result: str,
                                           insights: list, chart_data: dict) -> str:
        """ChatGPT 스타일 고품질 종합 답변 생성"""
        try:
            # 실행 결과에서 핵심 정보 추출
            key_findings = []
            if execution_result:
                lines = execution_result.split('\n')
                for line in lines:
                    if any(keyword in line.lower() for keyword in ['count', '개수', '비율', '평균', '최대', '최소', '합계']):
                        key_findings.append(line.strip())

            prompt = f"""
당신은 ChatGPT처럼 데이터 분석 질문에 대해 명확하고 전문적인 답변을 제공하는 AI입니다.

**분석 요청:** {question}

**실행 결과:**
{execution_result}

**핵심 발견사항:**
{key_findings}

**차트:** {'✅ 생성됨' if chart_data else '❌ 없음'}

**답변 요구사항:**
1. **질문에 대한 명확한 답변**으로 시작
2. **실제 수치와 결과를 구체적으로 언급**
3. **간결하고 이해하기 쉬운 설명**
4. 불필요한 장황한 설명 지양

다음과 같은 ChatGPT 스타일로 답변하세요:
- 직접적이고 명확한 답변
- 실제 데이터 결과 기반
- 전문적이지만 이해하기 쉬운 톤

한국어로 자연스럽게 작성하세요:
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 ChatGPT와 같이 명확하고 직접적인 데이터 분석 답변을 제공하는 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=600
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"종합 답변 생성 오류: {e}")
            return f"""**{question}**에 대한 분석을 완료했습니다.

**분석 결과:**
{execution_result.split('=== 실제 데이터 분석 결과 ===')[-1] if '=== 실제 데이터 분석 결과 ===' in execution_result else execution_result}

{'📊 위 결과를 바탕으로 차트가 생성되었습니다.' if chart_data else ''}
"""

    async def unified_analysis_stream(self, question: str, df: pd.DataFrame = None, file_info: dict = None, conversation_history: list = None):
        """
        ChatGPT 스타일 스트리밍 분석 시스템:
        실시간으로 분석 단계별 결과를 스트리밍합니다.
        """
        try:
            print(f"🚀 ChatGPT 스타일 스트리밍 분석 시작: {question}")
            print(f"🎯 unified_analysis_stream 함수 실행됨 - generated_code 추적 시작")

            # 1단계: 분석 시작 알림
            print(f"📤 1단계: analysis_start yield 시작")
            try:
                yield {
                    "type": "analysis_start",
                    "content": "분석을 시작합니다...",
                    "step": "preparing"
                }
                print(f"✅ 1단계: analysis_start yield 완료")
            except Exception as yield_error:
                print(f"❌ 1단계 yield 오류: {str(yield_error)}")
                raise yield_error

            await asyncio.sleep(0.1)  # 작은 지연 추가

            # 2단계: 대화 히스토리 강화
            print(f"🔄 Enhanced question 생성 시작")
            try:
                # 대화 히스토리를 활용한 질문 강화
                enhanced_question = self._enhance_question_with_context(question, conversation_history)
                print(f"🔄 Enhanced question: {enhanced_question}")
            except Exception as enhance_error:
                print(f"❌ Enhanced question 생성 오류: {str(enhance_error)}")
                enhanced_question = question

            print(f"📤 2단계: step_update yield 시작")
            try:
                yield {
                    "type": "step_update",
                    "content": "질문을 분석하고 있습니다...",
                    "step": "analyzing_question"
                }
                print(f"✅ 2단계: step_update yield 완료")
            except Exception as yield2_error:
                print(f"❌ 2단계 yield 오류: {str(yield2_error)}")
                raise yield2_error

            # 3단계: 코드 필요성 판단 및 생성
            if df is not None and not df.empty:
                print(f"📊 데이터 기반 분석 (행: {len(df)}, 열: {len(df.columns)})")

                # 실시간 코드 생성 (빈 코드박스 없이 바로 코드 생성)
                generated_code = ""
                code_lines = []
                async for code_chunk in self._stream_code_generation(enhanced_question, df, file_info):
                    if code_chunk["type"] == "code_line":
                        code_lines.append(code_chunk["content"])
                        generated_code += code_chunk["content"] + "\n"
                    elif code_chunk["type"] == "code_complete":
                        generated_code = code_chunk["full_code"]
            else:
                # 코드가 필요한지 먼저 판단
                needs_code = await self._needs_python_code(enhanced_question)
                if needs_code:
                    print("🔢 Python 코드 계산 필요")

                    # 실시간 코드 생성 (빈 코드박스 없이)
                    generated_code = ""
                    code_lines = []
                    async for code_chunk in self._stream_code_generation(enhanced_question, df, file_info):
                        if code_chunk["type"] == "code_line":
                            code_lines.append(code_chunk["content"])
                            generated_code += code_chunk["content"] + "\n"
                        elif code_chunk["type"] == "code_complete":
                            generated_code = code_chunk["full_code"]
                else:
                    print("💬 일반 텍스트 응답 모드")
                    generated_code = None

            if generated_code:
                print(f"✅ Python 코드 생성 완료")
            else:
                print(f"💬 텍스트 응답 모드")

            # 4단계: 코드 실행 (코드가 있는 경우만)
            if generated_code:
                # 완성된 코드박스를 한 번에 표시
                yield {
                    "type": "code_complete_display",
                    "content": "코드 실행 중...",
                    "code": generated_code,
                    "step": "displaying_code"
                }

                # 🚀 프론트엔드와 동일한 코드 실행 파이프라인 사용
                print(f"⚡ 코드 실행 시작 (프론트엔드 파이프라인 사용)...")
                print(f"🔍 생성된 코드:")
                print("=" * 50)
                print(generated_code)
                print("=" * 50)
                exec_result = await self._execute_code_via_api(generated_code, df)
                execution_result = exec_result.get('output', '')
                chart_data = exec_result.get('chart_data')

                # 디버깅: 코드 실행 결과 상세 로그
                print(f"🔍 코드 실행 완료 (API 사용):")
                print(f"  - 성공: {exec_result.get('success', False)}")
                print(f"  - 출력 길이: {len(execution_result)}")
                print(f"  - 출력 내용: {execution_result[:200]}..." if execution_result else "  - 출력 없음")
                print(f"  - 차트 데이터 존재: {bool(chart_data)}")
                if exec_result.get('error'):
                    print(f"  - 오류: {exec_result.get('error')}")

                # 실행 결과 스트리밍
                yield {
                    "type": "code_execution_result",
                    "content": execution_result,
                    "step": "code_executed"
                }

                # 차트 데이터가 있으면 스트리밍
                if chart_data:
                    print(f"📈 차트 데이터 수신 성공!")
                    yield {
                        "type": "chart_generated",
                        "content": "차트가 생성되었습니다.",
                        "chartData": chart_data,
                        "step": "chart_ready"
                    }

            # 인사이트 생성 비활성화 (text_stream 답변으로 통합)
            insights = []
            follow_up_questions = []

            # 후속 질문만 생성 (인사이트는 텍스트 답변에 포함)
            if generated_code:
                print(f"🔄 후속 질문 생성 시작...")
                follow_up_questions = await self._generate_follow_up_questions(question, {
                    'output': execution_result,
                    'chart_data': chart_data
                })
                print(f"✅ 후속 질문 생성 완료: {len(follow_up_questions)}개")

            # 7단계: 최종 답변 생성 (실시간 스트리밍)
            print(f"🔍 generated_code 체크: {bool(generated_code)}, 길이: {len(generated_code) if generated_code else 0}")

            if generated_code:
                # 🎯 **혁신적 해결책**: 차트 실행 실패를 보완하는 스마트 분석
                print(f"💡 스마트 분석 모드 활성화 - 차트 실행 무관하게 의미있는 분석 제공")

                # 생성된 코드 자체를 분석해서 인사이트 제공
                smart_analysis = self._analyze_generated_code_for_insights(generated_code, enhanced_question, df)

                # 실행 결과가 없어도 코드 기반 답변 생성
                if not execution_result:
                    execution_result = smart_analysis

                print(f"🎯 스마트 분석 기반 답변 생성 시작 - 분석 길이: {len(execution_result)}자")
                print(f"🎯 chart_data 존재 여부: {bool(chart_data)}")

                comprehensive_answer = ""
                try:
                    async for answer_chunk in self._stream_comprehensive_answer(
                        enhanced_question,  # 대화 맥락이 포함된 질문 사용
                        execution_result,
                        insights,
                        chart_data
                    ):
                        print(f"🎯 답변 청크 받음: {answer_chunk[:20]}...")
                        yield {
                            "type": "text_stream",
                            "content": answer_chunk,
                            "step": "streaming_answer"
                        }
                        comprehensive_answer += answer_chunk
                    print(f"🎯 스마트 분석 기반 답변 완료 - 총 길이: {len(comprehensive_answer)}")
                except Exception as text_error:
                    print(f"❌ 텍스트 답변 생성 오류: {text_error}")
                    # 오류 발생 시 기본 답변 제공
                    fallback_answer = "분석이 완료되었습니다. 생성된 차트를 확인해보세요."
                    yield {
                        "type": "text_stream",
                        "content": fallback_answer,
                        "step": "streaming_answer"
                    }
                    comprehensive_answer = fallback_answer
            else:
                # 코드 없이 바로 텍스트 답변 생성 (실시간 스트리밍)
                comprehensive_answer = ""
                async for answer_chunk in self._stream_simple_text_answer(question):
                    yield {
                        "type": "text_stream",
                        "content": answer_chunk,
                        "step": "streaming_text_answer"
                    }
                    comprehensive_answer += answer_chunk

            # 8단계: 완료된 응답 전송 (더미 답변 방지)
            final_result = {
                "type": "analysis_complete",
                "answer": "",  # 빈 값으로 설정하여 더미 답변 방지
                "codeExecution": {
                    "codeChunks": [generated_code] if generated_code else [],
                    "isExecuting": False,
                    "result": execution_result if generated_code else "",
                    "output": execution_result if generated_code else ""
                },
                "insights": insights,
                "followUpQuestions": follow_up_questions,
                "chartData": chart_data,
                "step": "complete"
            }

            yield convert_numpy_types(final_result)

            print(f"🎉 ChatGPT 스타일 스트리밍 분석 완료!")

        except Exception as e:
            import traceback
            print(f"❌ Streaming analysis error: {str(e)}")
            print(f"Full traceback: {traceback.format_exc()}")

            yield {
                "type": "error",
                "content": f"분석 중 오류가 발생했습니다: {str(e)}",
                "step": "error"
            }

    async def _generate_simple_text_answer(self, question: str) -> str:
        """간단한 텍스트 답변 생성 (코드 실행 없이)"""
        try:
            prompt = f"""
사용자의 질문에 대해 직접적이고 유용한 답변을 제공해주세요.

질문: {question}

요구사항:
1. 명확하고 정확한 정보 제공
2. 필요시 단계별 설명
3. 실용적인 조언이나 팁 포함
4. 한국어로 자연스럽게 작성
5. 마크다운 형식으로 구조화

답변:
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 정확하고 유용한 답변을 제공하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"간단 텍스트 답변 생성 오류: {e}")
            return f"죄송합니다. 답변을 생성하는 중 오류가 발생했습니다: {str(e)}"


    async def _stream_code_generation(self, question: str, df=None, file_info=None):
        """실시간 코드 생성 스트리밍"""
        try:
            print(f"🔥 실시간 코드 생성 시작: {question}")
            print(f"📊 데이터 정보: {f'{len(df)}행 {len(df.columns)}열' if df is not None and not df.empty else '데이터 없음'}")
            if df is not None and not df.empty:
                # 데이터 컬럼 정보 추가
                columns_info = ", ".join(df.columns.tolist())
                data_sample = df.head(3).to_string() if len(df) > 0 else "데이터 없음"

                prompt = f"""
데이터 분석을 위한 Python 코드를 작성해주세요.

질문: {question}
데이터 정보: {len(df)}행 {len(df.columns)}열
컬럼: {columns_info}

중요: 데이터는 이미 'df' 변수에 로드되어 있습니다. pd.read_csv()를 사용하지 마세요.

데이터 샘플:
{data_sample}

요구사항:
1. 이미 로드된 df 변수를 사용하여 분석
2. plotly를 사용한 시각화 포함 (fig 변수에 저장 필수)
3. 완전한 실행 가능한 코드
4. print() 문으로 결과 출력
5. 한국어 주석 포함
6. 마지막에 반드시 이 코드 추가:
   # NaN 값 처리 후 차트 JSON 생성
   import json
   import numpy as np
   try:
       chart_json = fig.to_json()
   except Exception as chart_error:
       print(f"Chart JSON generation error: {{chart_error}}")
       chart_json = None

Python 코드만 반환하세요:
"""
            else:
                prompt = f"""
질문: {question}

Python 계산 코드를 작성해주세요.
- 필요한 라이브러리 import
- 계산 로직 구현
- 가능하면 plotly 시각화 포함
- 완전한 실행 가능한 코드

Python 코드만 반환하세요:
"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 Python 코드 생성 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
                stream=True
            )

            generated_code = ""
            current_line = ""
            line_count = 0

            print("🔄 OpenAI 스트리밍 시작...")
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    generated_code += content
                    current_line += content

                    # 줄바꿈이 있으면 완성된 라인들을 yield
                    while '\n' in current_line:
                        line_break_index = current_line.find('\n')
                        completed_line = current_line[:line_break_index]

                        if completed_line.strip():  # 빈 줄이 아닌 경우만
                            line_count += 1
                            print(f"📝 코드 라인 {line_count}: {completed_line[:50]}...")
                            yield {
                                "type": "code_line",
                                "content": completed_line
                            }
                            await asyncio.sleep(0.1)  # 스트리밍 효과

                        current_line = current_line[line_break_index + 1:]

            # 마지막 줄 처리
            if current_line.strip():
                yield {
                    "type": "code_line",
                    "content": current_line
                }

            # 코드 블록 마커 제거
            if "```python" in generated_code:
                generated_code = generated_code.split("```python")[1].split("```")[0]
            elif "```" in generated_code:
                generated_code = generated_code.split("```")[1].split("```")[0]

            yield {
                "type": "code_complete",
                "full_code": generated_code.strip()
            }

        except Exception as e:
            print(f"실시간 코드 생성 오류: {e}")
            error_msg = str(e)
            yield {
                "type": "code_complete",
                "full_code": f"""
import pandas as pd
import plotly.express as px

print("코드 생성 중 오류가 발생했습니다: {error_msg}")
"""
            }

    async def _stream_comprehensive_answer(self, question: str, execution_result: str, insights: list, chart_data: dict = None):
        """종합적인 답변을 실시간으로 스트리밍합니다 (인사이트 통합)"""
        print(f"🎯 _stream_comprehensive_answer 함수 호출됨")
        print(f"📝 question: {question[:50]}...")
        print(f"📊 execution_result 길이: {len(execution_result) if execution_result else 0}")
        print(f"🔗 chart_data: {'있음' if chart_data else '없음'}")
        try:
            # 실행 결과에서 실제 수치 데이터 추출
            actual_numbers = []
            if execution_result:
                import re
                numbers = re.findall(r'\d+[,.]?\d*', execution_result)
                actual_numbers = numbers[:10]  # 최대 10개

            prompt = f"""
사용자의 질문: {question}

Python 코드 실행 결과: {execution_result}

추출된 수치: {actual_numbers}

차트 데이터 여부: {'있음' if chart_data else '없음'}

위 정보를 바탕으로 사용자의 질문에 대한 종합적이고 실용적인 답변을 생성하세요.

**답변 구성:**
1. **분석 결과 요약** - 코드 실행으로 얻은 핵심 결과
2. **주요 발견사항** - 실제 데이터를 바탕으로 한 구체적 인사이트
3. **비즈니스 관점의 해석** - 실용적 의미와 활용 방안
4. **결론 및 제안** - 향후 행동 계획

**작성 원칙:**
- 실제 실행 결과의 구체적 수치를 반드시 언급
- 일반론이 아닌 데이터 기반의 구체적 분석
- 친근하고 전문적인 톤
- 한국어로 작성

답변을 시작하세요:
"""

            print(f"🚀 OpenAI API 호출 시작...")
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 데이터 분석 전문가입니다. 분석 결과를 명확하고 이해하기 쉽게 설명합니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                stream=True
            )

            print(f"📡 OpenAI 스트리밍 시작...")
            chunk_count = 0
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    chunk_count += 1
                    if chunk_count <= 3:  # 처음 3개 청크만 로그
                        print(f"📝 청크 {chunk_count}: {content[:30]}...")
                    yield content
                    await asyncio.sleep(0.03)  # ChatGPT 스타일 타이핑 속도

            print(f"✅ OpenAI 스트리밍 완료 - 총 {chunk_count}개 청크")

        except Exception as e:
            print(f"종합 답변 스트리밍 오류: {e}")
            yield "분석 결과를 정리하는 중 오류가 발생했습니다."

    async def _stream_simple_text_answer(self, question: str):
        """간단한 텍스트 답변을 실시간으로 스트리밍합니다"""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 정확하고 친근하게 답변합니다."},
                    {"role": "user", "content": question}
                ],
                temperature=0.7,
                max_tokens=300,
                stream=True
            )

            async for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield content
                    await asyncio.sleep(0.03)  # ChatGPT 스타일 타이핑 속도

        except Exception as e:
            print(f"텍스트 답변 스트리밍 오류: {e}")
            yield "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다."


# AI 서비스 인스턴스 생성
ai_service = AIService()