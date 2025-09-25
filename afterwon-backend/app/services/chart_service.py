import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import plotly.figure_factory as ff
from typing import Dict, Any, List, Union, Tuple
import warnings
warnings.filterwarnings('ignore')

class ChartRecommendationEngine:
    """Intelligent chart recommendation system based on data characteristics"""
    
    def __init__(self):
        self.recommendation_rules = self._build_recommendation_rules()
    
    def _build_recommendation_rules(self) -> Dict[str, Any]:
        """Build comprehensive recommendation rules"""
        return {
            "data_patterns": {
                "single_numeric": ["histogram", "distplot", "box", "ecdf"],
                "two_numeric": ["scatter", "line", "density_contour", "density_heatmap"],
                "multiple_numeric": ["heatmap", "parallel_coordinates", "radar", "scatter_3d"],
                "single_categorical": ["pie", "bar", "funnel", "treemap"],
                "cat_vs_numeric": ["bar", "box", "violin", "strip"],
                "time_series": ["line", "area", "candlestick", "waterfall"],
                "hierarchical": ["treemap", "sunburst", "dendogram"],
                "flow_data": ["sankey", "parallel_categories"],
                "financial": ["candlestick", "ohlc", "waterfall"],
                "geospatial": ["map", "choropleth"],
                "network": ["sankey", "network_graph"]
            },
            
            "analysis_intent": {
                "distribution": ["histogram", "distplot", "box", "violin", "ecdf"],
                "comparison": ["bar", "line", "radar", "parallel_coordinates"],
                "correlation": ["scatter", "heatmap", "density_contour"],
                "trend": ["line", "area", "waterfall"],
                "proportion": ["pie", "treemap", "sunburst", "funnel"],
                "ranking": ["bar", "funnel"],
                "flow": ["sankey", "parallel_categories", "waterfall"],
                "outlier_detection": ["box", "violin", "scatter"],
                "multivariate": ["radar", "parallel_coordinates", "heatmap"]
            },
            
            "data_characteristics": {
                "small_dataset": ["scatter", "line", "bar", "box"],
                "large_dataset": ["histogram", "heatmap", "density_heatmap", "sample_based"],
                "high_cardinality": ["histogram", "density_plots"],
                "low_cardinality": ["pie", "bar", "funnel"],
                "many_dimensions": ["parallel_coordinates", "radar", "heatmap"],
                "temporal": ["line", "area", "candlestick"],
                "categorical": ["bar", "pie", "treemap", "sunburst"],
                "continuous": ["histogram", "density_plots", "scatter"]
            }
        }
    
    def recommend_charts(self, df: pd.DataFrame, question: str = "", top_k: int = 5) -> List[Dict[str, Any]]:
        """Recommend best chart types for the given data and question"""
        
        # Analyze data characteristics
        data_analysis = self._analyze_data_characteristics(df)
        
        # Analyze user intent from question
        intent_analysis = self._analyze_user_intent(question)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(data_analysis, intent_analysis, top_k)
        
        return recommendations
    
    def _analyze_data_characteristics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Comprehensive data analysis for chart recommendations"""
        
        analysis = {
            "shape": df.shape,
            "column_types": {},
            "data_patterns": [],
            "complexity_score": 0,
            "special_characteristics": []
        }
        
        # Column type analysis
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        analysis["column_types"] = {
            "numeric": numeric_cols,
            "categorical": categorical_cols,
            "datetime": datetime_cols,
            "numeric_count": len(numeric_cols),
            "categorical_count": len(categorical_cols),
            "datetime_count": len(datetime_cols)
        }
        
        # Data patterns identification
        if len(numeric_cols) == 1 and len(categorical_cols) == 0:
            analysis["data_patterns"].append("single_numeric")
        elif len(numeric_cols) == 2:
            analysis["data_patterns"].append("two_numeric")
        elif len(numeric_cols) > 2:
            analysis["data_patterns"].append("multiple_numeric")
        
        if len(categorical_cols) == 1 and len(numeric_cols) == 0:
            analysis["data_patterns"].append("single_categorical")
        elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            analysis["data_patterns"].append("cat_vs_numeric")
        
        if len(datetime_cols) > 0:
            analysis["data_patterns"].append("time_series")
        
        # Check for hierarchical data patterns
        if any('parent' in col.lower() or 'category' in col.lower() or 'group' in col.lower() 
               for col in categorical_cols):
            analysis["data_patterns"].append("hierarchical")
        
        # Check for financial data patterns
        financial_keywords = ['open', 'high', 'low', 'close', 'volume', 'price']
        if any(any(keyword in col.lower() for keyword in financial_keywords) for col in df.columns):
            analysis["data_patterns"].append("financial")
        
        # Dataset size characteristics
        if len(df) < 100:
            analysis["special_characteristics"].append("small_dataset")
        elif len(df) > 10000:
            analysis["special_characteristics"].append("large_dataset")
        
        # High/low cardinality analysis
        for col in categorical_cols:
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio > 0.8:
                analysis["special_characteristics"].append("high_cardinality")
            elif unique_ratio < 0.1:
                analysis["special_characteristics"].append("low_cardinality")
        
        # Dimensionality
        if len(numeric_cols) > 5:
            analysis["special_characteristics"].append("many_dimensions")
        
        # Calculate complexity score
        analysis["complexity_score"] = (
            len(numeric_cols) * 1 + 
            len(categorical_cols) * 0.5 + 
            len(datetime_cols) * 1.5 +
            (len(df) / 10000)  # Dataset size factor
        )
        
        return analysis
    
    def _analyze_user_intent(self, question: str) -> Dict[str, Any]:
        """Analyze user intent from the question"""
        
        question_lower = question.lower()
        intent = {
            "primary_intent": "explore",
            "analysis_types": [],
            "keywords": question_lower.split()
        }
        
        # Intent keyword mapping
        intent_keywords = {
            "distribution": ["분포", "distribution", "histogram", "spread", "범위"],
            "comparison": ["비교", "compare", "차이", "difference", "vs", "versus"],
            "correlation": ["상관관계", "correlation", "관계", "relationship", "연관"],
            "trend": ["트렌드", "trend", "변화", "change", "시간", "time", "추이"],
            "proportion": ["비율", "proportion", "percentage", "구성", "composition"],
            "ranking": ["순위", "rank", "top", "bottom", "highest", "lowest"],
            "outlier": ["이상치", "outlier", "이상", "특이", "extreme"]
        }
        
        # Identify analysis types from question
        for intent_type, keywords in intent_keywords.items():
            if any(keyword in question_lower for keyword in keywords):
                intent["analysis_types"].append(intent_type)
        
        # Set primary intent
        if intent["analysis_types"]:
            intent["primary_intent"] = intent["analysis_types"][0]
        
        return intent
    
    def _generate_recommendations(self, data_analysis: Dict[str, Any], 
                                intent_analysis: Dict[str, Any], top_k: int) -> List[Dict[str, Any]]:
        """Generate chart recommendations with scoring"""
        
        chart_scores = {}
        
        # Score based on data patterns
        for pattern in data_analysis["data_patterns"]:
            if pattern in self.recommendation_rules["data_patterns"]:
                for chart_type in self.recommendation_rules["data_patterns"][pattern]:
                    chart_scores[chart_type] = chart_scores.get(chart_type, 0) + 3
        
        # Score based on analysis intent
        for intent_type in intent_analysis["analysis_types"]:
            if intent_type in self.recommendation_rules["analysis_intent"]:
                for chart_type in self.recommendation_rules["analysis_intent"][intent_type]:
                    chart_scores[chart_type] = chart_scores.get(chart_type, 0) + 2
        
        # Score based on data characteristics
        for characteristic in data_analysis["special_characteristics"]:
            if characteristic in self.recommendation_rules["data_characteristics"]:
                for chart_type in self.recommendation_rules["data_characteristics"][characteristic]:
                    chart_scores[chart_type] = chart_scores.get(chart_type, 0) + 1
        
        # Sort by score and create recommendations
        sorted_charts = sorted(chart_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        
        recommendations = []
        for chart_type, score in sorted_charts:
            recommendation = {
                "chart_type": chart_type,
                "score": score,
                "rationale": self._get_chart_rationale(chart_type, data_analysis, intent_analysis),
                "korean_name": self._get_korean_chart_name(chart_type),
                "best_for": self._get_chart_use_cases(chart_type)
            }
            recommendations.append(recommendation)
        
        # If no specific recommendations, provide default based on data
        if not recommendations:
            recommendations = self._get_default_recommendations(data_analysis)
        
        return recommendations
    
    def _get_chart_rationale(self, chart_type: str, data_analysis: Dict, intent_analysis: Dict) -> str:
        """Generate rationale for chart recommendation"""
        
        rationales = {
            "histogram": f"단일 수치형 변수({data_analysis['column_types']['numeric_count']}개)의 분포를 보기에 최적",
            "scatter": f"두 수치형 변수 간의 상관관계를 시각화하기에 이상적",
            "bar": f"카테고리별 비교 분석에 가장 직관적이고 효과적",
            "line": f"시계열 데이터나 연속적인 변화 추이를 보기에 최적",
            "pie": f"전체에서 각 부분이 차지하는 비율을 한눈에 파악하기 좋음",
            "box": f"데이터의 분포, 중위값, 사분위수, 이상치를 한 번에 확인 가능",
            "violin": f"박스플롯보다 더 상세한 분포 형태를 보여주는 고급 통계 차트",
            "heatmap": f"다수의 변수 간 상관관계를 색상으로 직관적으로 표현",
            "treemap": f"계층적 데이터를 면적으로 표현하여 비율과 구조를 동시에 파악",
            "radar": f"다차원 데이터를 한 눈에 비교 분석하기에 적합"
        }
        
        return rationales.get(chart_type, f"{chart_type} 차트는 현재 데이터 특성에 적합합니다")
    
    def _get_korean_chart_name(self, chart_type: str) -> str:
        """Get Korean names for chart types"""
        
        korean_names = {
            "histogram": "히스토그램", "scatter": "산포도", "bar": "막대차트", "line": "선차트",
            "pie": "파이차트", "box": "박스플롯", "violin": "바이올린플롯", "area": "영역차트",
            "heatmap": "히트맵", "treemap": "트리맵", "sunburst": "선버스트차트", 
            "funnel": "깔때기차트", "waterfall": "폭포차트", "radar": "레이더차트",
            "scatter_3d": "3D 산점도", "surface": "3D 표면차트", "candlestick": "캔들스틱",
            "parallel_coordinates": "평행좌표", "distplot": "분포플롯", "ecdf": "누적분포함수",
            "choropleth": "지도차트", "scattergeo": "지리적 산점도"
        }
        
        return korean_names.get(chart_type, chart_type)
    
    def _get_chart_use_cases(self, chart_type: str) -> List[str]:
        """Get specific use cases for each chart type"""
        
        use_cases = {
            "histogram": ["데이터 분포 확인", "이상치 탐지", "정규성 검정"],
            "scatter": ["상관관계 분석", "회귀분석 시각화", "클러스터링 확인"],
            "bar": ["카테고리별 비교", "순위 분석", "집계 결과 표시"],
            "line": ["시계열 트렌드 분석", "성장률 추적", "예측 모델 결과"],
            "pie": ["구성 비율 분석", "시장 점유율", "예산 배분"],
            "box": ["통계 요약", "그룹간 분포 비교", "이상치 식별"],
            "heatmap": ["상관행렬 시각화", "패턴 탐지", "히트 분석"],
            "treemap": ["계층적 비율", "포트폴리오 분석", "조직도"],
            "radar": ["다차원 성능 비교", "프로필 분석", "균형도 평가"],
            "choropleth": ["지역별 데이터 분포", "국가별 통계", "행정구역별 분석"],
            "scattergeo": ["위치 기반 분석", "지리적 클러스터링", "GPS 데이터 시각화"]
        }
        
        return use_cases.get(chart_type, ["데이터 시각화"])
    
    def _get_default_recommendations(self, data_analysis: Dict) -> List[Dict[str, Any]]:
        """Provide default recommendations when no specific match"""
        
        defaults = []
        
        if data_analysis["column_types"]["numeric_count"] > 0:
            defaults.append({
                "chart_type": "histogram",
                "score": 2,
                "rationale": "수치형 데이터의 기본적인 분포 확인",
                "korean_name": "히스토그램",
                "best_for": ["분포 분석", "이상치 탐지"]
            })
        
        if data_analysis["column_types"]["categorical_count"] > 0:
            defaults.append({
                "chart_type": "bar",
                "score": 2,
                "rationale": "카테고리형 데이터의 빈도 분석",
                "korean_name": "막대차트",
                "best_for": ["빈도 분석", "카테고리 비교"]
            })
        
        return defaults[:3]

class ChartService:
    
    def __init__(self):
        """Initialize comprehensive chart support"""
        try:
            self.chart_registry = self._build_chart_registry()
            self.recommendation_engine = ChartRecommendationEngine()
            print("✅ ChartService initialized successfully")
        except Exception as e:
            print(f"❌ Error initializing ChartService: {e}")
            # Fallback initialization
            self.chart_registry = {}
            self.recommendation_engine = None
    
    def _build_chart_registry(self) -> Dict[str, Dict[str, Any]]:
        """Build comprehensive registry of all Plotly chart types"""
        return {
            # BASIC CHARTS
            "bar": {"method": "_create_bar_chart", "category": "basic", "requires_y": True},
            "line": {"method": "_create_line_chart", "category": "basic", "requires_y": True},
            "scatter": {"method": "_create_scatter_chart", "category": "basic", "requires_y": True},
            "pie": {"method": "_create_pie_chart", "category": "basic", "requires_y": False},
            
            # STATISTICAL CHARTS
            "histogram": {"method": "_create_histogram_chart", "category": "statistical", "requires_y": False},
            "box": {"method": "_create_box_chart", "category": "statistical", "requires_y": True},
            "violin": {"method": "_create_violin_chart", "category": "statistical", "requires_y": True},
            "strip": {"method": "_create_strip_chart", "category": "statistical", "requires_y": True},
            "density_contour": {"method": "_create_density_contour", "category": "statistical", "requires_y": True},
            "density_heatmap": {"method": "_create_density_heatmap", "category": "statistical", "requires_y": True},
            
            # ADVANCED VISUALIZATIONS
            "heatmap": {"method": "_create_heatmap_chart", "category": "matrix", "requires_y": False},
            "area": {"method": "_create_area_chart", "category": "basic", "requires_y": True},
            "funnel": {"method": "_create_funnel_chart", "category": "specialized", "requires_y": True},
            "waterfall": {"method": "_create_waterfall_chart", "category": "specialized", "requires_y": True},
            "sankey": {"method": "_create_sankey_chart", "category": "network", "requires_y": False},
            "treemap": {"method": "_create_treemap_chart", "category": "hierarchical", "requires_y": True},
            "sunburst": {"method": "_create_sunburst_chart", "category": "hierarchical", "requires_y": True},
            
            # SCIENTIFIC/SPECIALIZED
            "radar": {"method": "_create_radar_chart", "category": "specialized", "requires_y": True},
            "polar": {"method": "_create_polar_chart", "category": "specialized", "requires_y": True},
            "ternary": {"method": "_create_ternary_chart", "category": "specialized", "requires_y": True},
            "parallel_coordinates": {"method": "_create_parallel_coordinates", "category": "multivariate", "requires_y": False},
            "parallel_categories": {"method": "_create_parallel_categories", "category": "multivariate", "requires_y": False},
            
            # 3D CHARTS
            "scatter_3d": {"method": "_create_scatter_3d", "category": "3d", "requires_y": True},
            "line_3d": {"method": "_create_line_3d", "category": "3d", "requires_y": True},
            "surface": {"method": "_create_surface_chart", "category": "3d", "requires_y": True},
            "mesh3d": {"method": "_create_mesh3d", "category": "3d", "requires_y": True},
            
            # FINANCIAL
            "candlestick": {"method": "_create_candlestick", "category": "financial", "requires_y": True},
            "ohlc": {"method": "_create_ohlc", "category": "financial", "requires_y": True},
            
            # TIME SERIES SPECIALIZED
            "timeline": {"method": "_create_timeline", "category": "temporal", "requires_y": True},
            
            # DISTRIBUTION SPECIALIZED
            "distplot": {"method": "_create_distplot", "category": "distribution", "requires_y": False},
            "ecdf": {"method": "_create_ecdf", "category": "distribution", "requires_y": False},
            
            # SPECIALIZED SCIENTIFIC
            "splom": {"method": "_create_splom", "category": "multivariate", "requires_y": False},
            "dendogram": {"method": "_create_dendogram", "category": "clustering", "requires_y": False},
            
            # IMAGE/HEATMAP VARIANTS
            "imshow": {"method": "_create_imshow", "category": "image", "requires_y": False},

            # GEO CHARTS
            "choropleth": {"method": "_create_choropleth_chart", "category": "geo", "requires_y": True},
            "scattergeo": {"method": "_create_scattergeo_chart", "category": "geo", "requires_y": True}
        }
    
    def generate_plotly_chart(self, df: pd.DataFrame, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Universal Plotly chart generator supporting all chart types"""

        chart_type = chart_config.get("chart_type", "bar")
        chart_columns = chart_config.get("chart_columns", {})

        print(f"🎨 generate_plotly_chart called with chart_type: {chart_type}")
        print(f"📊 Chart columns: {chart_columns}")

        # Get chart info from registry
        chart_info = self.chart_registry.get(chart_type)
        if not chart_info:
            print(f"❌ Unsupported chart type: {chart_type}, falling back to bar chart")
            chart_type = "bar"
            chart_info = self.chart_registry["bar"]
        else:
            print(f"✅ Found chart info for {chart_type}: {chart_info}")

        # Prepare data based on chart requirements
        prepared_data = self._prepare_data_for_chart(df, chart_columns, chart_info, chart_config)
        
        try:
            # Get the method and call it
            method_name = chart_info["method"]
            if hasattr(self, method_name):
                method = getattr(self, method_name)
                return method(prepared_data["df"], prepared_data["x_col"], prepared_data.get("y_col"), chart_config)
            else:
                print(f"Method {method_name} not implemented yet, falling back to bar chart")
                return self._create_bar_chart(df, prepared_data["x_col"], prepared_data.get("y_col", "Count"), chart_config)
        
        except Exception as e:
            print(f"Error creating {chart_type} chart: {e}")
            return self._create_default_chart(df, str(e))
    
    def _prepare_data_for_chart(self, df: pd.DataFrame, chart_columns: Dict[str, str], chart_info: Dict[str, Any], chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare data based on chart type requirements"""

        print(f"🔧 _prepare_data_for_chart called")
        print(f"📊 Chart columns: {chart_columns}")
        print(f"📋 Available columns: {list(df.columns)}")
        print(f"📈 Chart info: {chart_info}")

        # Get basic columns and ensure they are strings, not lists
        x_col = chart_columns.get("x", df.columns[0] if len(df.columns) > 0 else None)
        y_col = chart_columns.get("y", df.columns[1] if len(df.columns) > 1 else None)

        print(f"🎯 Initial columns - X: {x_col}, Y: {y_col}")

        # Handle cases where columns might be passed as lists
        if isinstance(x_col, list):
            x_col = x_col[0] if x_col else None
        if isinstance(y_col, list):
            y_col = y_col[0] if y_col else None

        # Validate columns exist
        if x_col and x_col not in df.columns:
            print(f"⚠️ X column '{x_col}' not found, falling back to first column")
            x_col = df.columns[0] if len(df.columns) > 0 else None

        if y_col and y_col not in df.columns:
            print(f"⚠️ Y column '{y_col}' not found, falling back to second column")
            y_col = df.columns[1] if len(df.columns) > 1 else None

        print(f"✅ Final columns - X: {x_col}, Y: {y_col}")

        result_df = df.copy()

        # Enhanced logic for categorical vs numeric relationships
        if x_col and y_col and x_col in df.columns and y_col in df.columns:
            x_is_categorical = df[x_col].dtype == 'object' or df[x_col].nunique() < len(df) * 0.5
            y_is_numeric = df[y_col].dtype in ['int64', 'float64', 'int32', 'float32', 'int', 'float']

            # Handle categorical X vs numeric Y (common for correlation analysis)
            if x_is_categorical and y_is_numeric:
                print(f"🔄 Processing categorical vs numeric data: {x_col} (categorical) vs {y_col} (numeric)")

                # Group by categorical variable and aggregate numeric variable
                chart_type = chart_info.get("type", "bar")

                if chart_type in ["box", "violin"]:
                    # For box plots and violin plots, keep raw data
                    result_df = df[[x_col, y_col]].dropna()
                else:
                    # For bar charts, scatter, etc., aggregate by mean
                    df_grouped = df.groupby(x_col)[y_col].agg(['mean', 'count', 'std']).reset_index()
                    df_grouped.columns = [x_col, y_col, 'count', 'std']
                    result_df = df_grouped

                print(f"✅ Aggregated data shape: {result_df.shape}")
                return {
                    "df": result_df,
                    "x_col": x_col,
                    "y_col": y_col,
                    "chart_info": chart_info,
                    "data_type": "categorical_vs_numeric"
                }

        # Handle count-based analysis for charts that don't have a specific Y column
        if not chart_info["requires_y"] or y_col == "Count" or y_col is None:
            if x_col and x_col in df.columns:
                # Create value counts for categorical analysis
                if df[x_col].dtype == 'object' or df[x_col].nunique() < len(df) * 0.5:
                    df_grouped = df[x_col].value_counts().reset_index()
                    df_grouped.columns = [x_col, "Count"]
                    result_df = df_grouped
                    y_col = "Count"

        # Additional validation to ensure we have proper count data
        if y_col == "Count" and x_col in result_df.columns:
            if "Count" not in result_df.columns:
                # Fallback: Create proper counts if missing
                value_counts = df[x_col].value_counts().reset_index()
                value_counts.columns = [x_col, "Count"]
                result_df = value_counts

        # Ensure numeric data types for counts
        if "Count" in result_df.columns:
            result_df["Count"] = pd.to_numeric(result_df["Count"], errors='coerce').fillna(0)

        return {
            "df": result_df,
            "x_col": x_col,
            "y_col": y_col,
            "chart_info": chart_info
        }
    
    def get_chart_recommendations(self, df: pd.DataFrame, question: str = "") -> Dict[str, Any]:
        """Get intelligent chart recommendations for the data"""
        
        try:
            if self.recommendation_engine is None:
                # Fallback recommendations
                return self._get_fallback_recommendations(df)
            
            recommendations = self.recommendation_engine.recommend_charts(df, question, top_k=5)
            
            return {
                "recommendations": recommendations,
                "data_summary": {
                    "rows": len(df),
                    "columns": len(df.columns),
                    "numeric_columns": len(df.select_dtypes(include=[np.number]).columns),
                    "categorical_columns": len(df.select_dtypes(include=['object']).columns),
                    "datetime_columns": len(df.select_dtypes(include=['datetime64']).columns)
                },
                "suggested_message": self._generate_suggestion_message(recommendations)
            }
        except Exception as e:
            print(f"❌ Error in get_chart_recommendations: {e}")
            return self._get_fallback_recommendations(df)
    
    def _get_fallback_recommendations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Fallback recommendations when recommendation engine fails"""
        
        numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
        categorical_cols = len(df.select_dtypes(include=['object']).columns)
        
        recommendations = []
        
        if numeric_cols > 0:
            recommendations.append({
                "chart_type": "histogram",
                "score": 3,
                "rationale": "수치형 데이터의 분포를 확인하기에 적합",
                "korean_name": "히스토그램",
                "best_for": ["분포 분석", "이상치 탐지"]
            })
            
            if numeric_cols >= 2:
                recommendations.append({
                    "chart_type": "scatter",
                    "score": 2,
                    "rationale": "두 수치형 변수 간의 상관관계 분석",
                    "korean_name": "산포도",
                    "best_for": ["상관관계 분석", "클러스터링"]
                })
        
        if categorical_cols > 0:
            recommendations.append({
                "chart_type": "bar",
                "score": 2,
                "rationale": "카테고리별 빈도 분석에 최적",
                "korean_name": "막대차트",
                "best_for": ["빈도 분석", "카테고리 비교"]
            })
        
        return {
            "recommendations": recommendations,
            "data_summary": {
                "rows": len(df),
                "columns": len(df.columns),
                "numeric_columns": numeric_cols,
                "categorical_columns": categorical_cols,
                "datetime_columns": len(df.select_dtypes(include=['datetime64']).columns)
            },
            "suggested_message": self._generate_suggestion_message(recommendations)
        }
    
    def _generate_suggestion_message(self, recommendations: List[Dict[str, Any]]) -> str:
        """Generate user-friendly suggestion message"""
        
        if not recommendations:
            return "데이터 분석을 위한 기본 차트를 추천드립니다."
        
        top_recommendation = recommendations[0]
        
        message = f"""
📊 **데이터 분석을 위한 차트 추천**

**가장 적합한 차트**: {top_recommendation['korean_name']}
**추천 이유**: {top_recommendation['rationale']}

**다른 추천 차트들**:
"""
        
        for i, rec in enumerate(recommendations[1:4], 2):
            message += f"{i}. {rec['korean_name']} - {rec['rationale']}\n"
        
        message += "\n💡 원하는 차트 이름을 말씀해주시면 바로 생성해드립니다!"
        
        return message.strip()
    
    def _create_bar_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style bar chart with modern gradient design and enhanced interactivity"""
        # Modern vibrant color palette with gradients
        colors = [
            'rgba(99, 102, 241, 0.8)',    # Modern Purple
            'rgba(14, 165, 233, 0.8)',    # Sky Blue
            'rgba(34, 197, 94, 0.8)',     # Emerald Green
            'rgba(251, 113, 133, 0.8)',   # Rose Pink
            'rgba(249, 115, 22, 0.8)',    # Orange
            'rgba(139, 92, 246, 0.8)',    # Violet
            'rgba(6, 182, 212, 0.8)',     # Cyan
            'rgba(245, 158, 11, 0.8)',    # Amber
            'rgba(236, 72, 153, 0.8)',    # Fuchsia
            'rgba(16, 185, 129, 0.8)'     # Teal
        ]
        
        # Handle different data types for y-axis
        if y_col in df.columns and df[y_col].dtype in ['int64', 'float64', 'float32', 'int32']:
            # Numeric data - show top 15 for better analysis
            data = df.nlargest(15, y_col)
            y_values = data[y_col].tolist()
        elif y_col == "Count" and "Count" in df.columns:
            # Count column should contain the actual frequencies
            data = df.head(15)  # Already sorted by value_counts
            y_values = data["Count"].tolist()
        else:
            # Fallback case - create counts on the fly
            data = df.head(15)
            if len(data) > 0:
                # Create value counts dynamically
                original_data = df[x_col].value_counts().reset_index()
                original_data.columns = [x_col, "Count"]
                data = original_data.head(15)
                y_values = data["Count"].tolist()
            else:
                y_values = [1] * len(data)  # Ultimate fallback

        x_values = data[x_col].tolist()
        
        # Create dynamic colors for each bar
        bar_colors = [colors[i % len(colors)] for i in range(len(x_values))]

        fig = go.Figure(data=[
            go.Bar(
                x=x_values,
                y=y_values,
                marker=dict(
                    color=bar_colors,
                    line=dict(color='rgba(255,255,255,0.6)', width=2),
                    opacity=0.85,
                    # Add gradient-like effect with pattern
                    pattern=dict(
                        shape="",
                        bgcolor="rgba(255,255,255,0.1)"
                    )
                ),
                hovertemplate=(
                    f"<b>📊 {x_col}</b>: %{{x}}<br>"
                    f"<b>📈 {y_col}</b>: %{{y:,.0f}}<br>"
                    "<extra></extra>"
                ),
                hoverlabel=dict(
                    bgcolor="rgba(37, 37, 37, 0.95)",
                    bordercolor="rgba(255,255,255,0.2)",
                    font=dict(color="white", size=14, family="Inter, -apple-system, sans-serif")
                ),
                text=[f"{val:,.0f}" for val in y_values],
                textposition='outside',
                textfont=dict(size=11, color='rgba(55, 65, 81, 0.9)', family="Inter, sans-serif", weight='bold'),
                cliponaxis=False,  # Allow text to extend beyond plot area
                texttemplate='%{text}',
                showlegend=False
            )
        ])
        
        fig.update_layout(
            title=dict(
                text=f"<b style='color:#1f2937'>{y_col}</b> <span style='color:#6b7280'>분석 by</span> <b style='color:#1f2937'>{x_col}</b>",
                font=dict(size=20, color='#1f2937', family="Inter, -apple-system, BlinkMacSystemFont, sans-serif"),
                x=0.5, xanchor='center',
                y=0.95, yanchor='top',
                pad=dict(b=20)
            ),
            xaxis=dict(
                title=dict(
                    text=f"<b>{x_col}</b>",
                    font=dict(size=14, color='#374151', family="Inter, sans-serif")
                ),
                tickangle=-45 if x_values and len(str(max(x_values, key=lambda x: len(str(x))))) > 8 else 0,
                gridcolor='rgba(229, 231, 235, 0.6)',
                gridwidth=1,
                linecolor='rgba(156, 163, 175, 0.4)',
                tickfont=dict(size=11, color='#6b7280', family="Inter, sans-serif"),
                showline=True,
                mirror=False
            ),
            yaxis=dict(
                title=dict(
                    text=f"<b>{y_col}</b>",
                    font=dict(size=14, color='#374151', family="Inter, sans-serif")
                ),
                gridcolor='rgba(229, 231, 235, 0.6)',
                gridwidth=1,
                linecolor='rgba(156, 163, 175, 0.4)',
                tickfont=dict(size=11, color='#6b7280', family="Inter, sans-serif"),
                zeroline=True,
                zerolinecolor='rgba(156, 163, 175, 0.4)',
                showline=True,
                mirror=False,
                # Add extra space at the top for text labels
                range=[0, max(y_values) * 1.15] if y_values else [0, 1]
            ),
            plot_bgcolor='rgba(249, 250, 251, 0.4)',
            paper_bgcolor='white',
            font=dict(family="Inter, -apple-system, BlinkMacSystemFont, sans-serif", size=12, color='#374151'),
            margin=dict(l=70, r=40, t=160, b=120),
            showlegend=False,
            hovermode='closest',
            # Add subtle shadow effect
            annotations=[
                dict(
                    text="",
                    showarrow=False,
                    x=0, y=0,
                    xref="paper", yref="paper",
                    xanchor="left", yanchor="bottom",
                    xshift=-5, yshift=-5,
                    bgcolor="rgba(0,0,0,0.02)",
                    borderwidth=0
                )
            ]
        )
        
        return fig.to_dict()
    
    def _create_line_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style line chart with enhanced interactivity"""
        # Enhanced date handling and sorting
        data = df.copy()
        
        # Check if x column is datetime or could be datetime
        is_datetime_x = (data[x_col].dtype in ['datetime64[ns]', 'datetime64'] or 
                        pd.api.types.is_datetime64_any_dtype(data[x_col]) or
                        'date' in x_col.lower())
        
        if is_datetime_x:
            # Ensure x column is properly converted to datetime if needed
            if not pd.api.types.is_datetime64_any_dtype(data[x_col]):
                try:
                    data[x_col] = pd.to_datetime(data[x_col], errors='coerce')
                except:
                    pass
            
            # Remove any rows with invalid dates and sort
            data = data.dropna(subset=[x_col]).sort_values(x_col).head(50)
        else:
            data = data.head(50)
        
        fig = go.Figure(data=go.Scatter(
            x=data[x_col].tolist(),
            y=data[y_col].tolist(),
            mode='lines+markers',
            line=dict(
                color='rgba(99, 102, 241, 1)',
                width=4,
                shape='spline',
                smoothing=1.0  # Smooth line curves
            ),
            marker=dict(
                color='rgba(99, 102, 241, 0.9)',
                size=8,
                line=dict(color='white', width=2),
                symbol='circle'
            ),
            fill='tonexty',  # Add subtle area fill
            fillcolor='rgba(99, 102, 241, 0.1)',
            hovertemplate=(
                f"<b>📈 {x_col}</b>: %{{x}}<br>"
                f"<b>📊 {y_col}</b>: %{{y:,.2f}}<br>"
                "<extra></extra>"
            ),
            hoverlabel=dict(
                bgcolor="rgba(37, 37, 37, 0.95)",
                bordercolor="rgba(99, 102, 241, 0.8)",
                font=dict(color="white", size=14, family="Inter, -apple-system, sans-serif")
            ),
            name='데이터 추세'
        ))
        
        fig.update_layout(
            title=dict(
                text=f"<b style='color:#1f2937'>{y_col}</b> <span style='color:#6b7280'>Trend over</span> <b style='color:#1f2937'>{x_col}</b>",
                font=dict(size=20, color='#1f2937', family="Inter, -apple-system, BlinkMacSystemFont, sans-serif"),
                x=0.5, xanchor='center',
                y=0.95, yanchor='top',
                pad=dict(b=20)
            ),
            xaxis=dict(
                title=dict(
                    text=f"<b>{x_col}</b>",
                    font=dict(size=14, color='#374151', family="Inter, sans-serif")
                ),
                gridcolor='rgba(229, 231, 235, 0.6)',
                linecolor='rgba(156, 163, 175, 0.4)',
                type='date' if is_datetime_x else '-',
                tickformat='%Y-%m-%d' if is_datetime_x else None,
                tickfont=dict(size=11, color='#6b7280', family="Inter, sans-serif")
            ),
            yaxis=dict(
                title=dict(
                    text=f"<b>{y_col}</b>",
                    font=dict(size=14, color='#374151', family="Inter, sans-serif")
                ),
                gridcolor='rgba(229, 231, 235, 0.6)',
                linecolor='rgba(156, 163, 175, 0.4)',
                tickfont=dict(size=11, color='#6b7280', family="Inter, sans-serif")
            ),
            plot_bgcolor='rgba(249, 250, 251, 0.4)',
            paper_bgcolor='white',
            font=dict(family="Inter, -apple-system, BlinkMacSystemFont, sans-serif", size=12, color='#374151'),
            margin=dict(l=70, r=40, t=140, b=120),
            hovermode='x unified'
        )
        
        return fig.to_dict()
    
    def _create_pie_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style pie chart with enhanced visual appeal"""
        # Handle different data types
        if y_col in df.columns and df[y_col].dtype in ['int64', 'float64', 'float32', 'int32']:
            # Numeric data - use actual values
            data = df.nlargest(8, y_col)
            values = data[y_col].tolist()
            labels = data[x_col].tolist()
        elif y_col == "Count" and "Count" in df.columns:
            # Count column should contain the actual frequencies
            data = df.head(8)  # Already sorted by value_counts
            values = data["Count"].tolist()
            labels = data[x_col].tolist()
        else:
            # Create value counts for categorical data
            value_counts = df[x_col].value_counts().head(8)
            labels = value_counts.index.tolist()
            values = value_counts.values.tolist()
        
        # Modern gradient-style color palette with better contrast
        colors = [
            'rgba(99, 102, 241, 0.9)',    # Modern Purple
            'rgba(14, 165, 233, 0.9)',    # Sky Blue
            'rgba(34, 197, 94, 0.9)',     # Emerald Green
            'rgba(251, 113, 133, 0.9)',   # Rose Pink
            'rgba(249, 115, 22, 0.9)',    # Orange
            'rgba(139, 92, 246, 0.9)',    # Violet
            'rgba(6, 182, 212, 0.9)',     # Cyan
            'rgba(245, 158, 11, 0.9)'     # Amber
        ]

        fig = go.Figure(data=[go.Pie(
            labels=labels,
            values=values,
            hole=0.5,  # Larger donut hole for modern look
            marker=dict(
                colors=colors[:len(labels)],
                line=dict(color='white', width=3)  # Thicker white borders
            ),
            textinfo='label+percent',
            textfont=dict(
                size=12,
                color='#374151',
                family="Inter, -apple-system, sans-serif",
                style='bold'
            ),
            textposition='outside',
            hovertemplate=(
                "<b>🔸 %{label}</b><br>"
                "수량: %{value:,.0f}<br>"
                "비율: %{percent}<br>"
                "<extra></extra>"
            ),
            hoverlabel=dict(
                bgcolor="rgba(37, 37, 37, 0.95)",
                bordercolor="rgba(255,255,255,0.2)",
                font=dict(color="white", size=14, family="Inter, -apple-system, sans-serif")
            ),
            rotation=90,  # Rotate for better label positioning
            direction='clockwise'
        )])
        
        fig.update_layout(
            title=dict(
                text=f"<b style='color:#1f2937'>{y_col if y_col != 'Count' else 'Items'}</b> <span style='color:#6b7280'>Distribution by</span> <b style='color:#1f2937'>{x_col}</b>",
                font=dict(size=20, color='#1f2937', family="Inter, -apple-system, BlinkMacSystemFont, sans-serif"),
                x=0.5, xanchor='center',
                y=0.95, yanchor='top',
                pad=dict(b=20)
            ),
            paper_bgcolor='white',
            font=dict(family="Inter, -apple-system, BlinkMacSystemFont, sans-serif", size=12, color='#374151'),
            margin=dict(l=40, r=40, t=140, b=40),
            showlegend=True,
            legend=dict(
                orientation="v",
                yanchor="middle",
                y=0.5,
                xanchor="left",
                x=1.05
            )
        )
        
        return fig.to_dict()
    
    def _create_scatter_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style scatter plot with enhanced interactivity"""
        # Handle data validation and preparation
        try:
            # Ensure both columns exist
            if x_col not in df.columns or y_col not in df.columns:
                return self._create_default_chart(df, f"Required columns not found: {x_col}, {y_col}")

            # Clean and prepare data
            clean_data = df[[x_col, y_col]].copy()

            # Check if x_col is categorical and y_col is numeric
            x_is_categorical = clean_data[x_col].dtype == 'object' or clean_data[x_col].nunique() < len(clean_data) * 0.5
            y_is_numeric = pd.api.types.is_numeric_dtype(clean_data[y_col])

            if x_is_categorical and y_is_numeric:
                # Handle categorical vs numeric scatter plot (strip chart style)
                print(f"🎯 Creating categorical vs numeric scatter plot: {x_col} vs {y_col}")

                # Convert Y to numeric, handle non-numeric values
                clean_data[y_col] = pd.to_numeric(clean_data[y_col], errors='coerce')
                clean_data = clean_data.dropna()

                if len(clean_data) == 0:
                    return self._create_default_chart(df, f"No valid numeric data found in column {y_col}")

                # Limit data for performance
                data = clean_data.sample(min(1500, len(clean_data))) if len(clean_data) > 1500 else clean_data

                # Create scatter plot with jitter for categorical axis
                fig = go.Figure()
                categories = data[x_col].unique()
                colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#f1c40f', '#e67e22']

                for i, category in enumerate(categories):
                    cat_data = data[data[x_col] == category]

                    # Add small random jitter to x-axis for better visualization
                    x_pos = [i] * len(cat_data)
                    jitter = np.random.normal(0, 0.05, len(cat_data))  # Small jitter
                    x_jittered = [x + j for x, j in zip(x_pos, jitter)]

                    fig.add_trace(go.Scatter(
                        x=x_jittered,
                        y=cat_data[y_col].tolist(),
                        mode='markers',
                        name=str(category),
                        marker=dict(
                            size=8,
                            color=colors[i % len(colors)],
                            opacity=0.7,
                            line=dict(color='white', width=0.5)
                        ),
                        hovertemplate=(
                            f"<b>{x_col}</b>: {category}<br>"
                            f"<b>{y_col}</b>: %{{y}}<br>"
                            "<extra></extra>"
                        )
                    ))

                # Set x-axis to show category names
                fig.update_xaxes(
                    tickvals=list(range(len(categories))),
                    ticktext=[str(cat) for cat in categories]
                )

                correlation_text = ""  # No correlation for categorical data

            else:
                # Handle numeric vs numeric scatter plot (original logic)
                # Convert to numeric if possible, drop non-numeric rows
                clean_data[x_col] = pd.to_numeric(clean_data[x_col], errors='coerce')
                clean_data[y_col] = pd.to_numeric(clean_data[y_col], errors='coerce')

                # Remove rows with missing values
                clean_data = clean_data.dropna()

                if len(clean_data) == 0:
                    return self._create_default_chart(df, f"No valid numeric data found in columns {x_col} and {y_col}")

                # Limit data for performance but ensure good representation
                data = clean_data.sample(min(1000, len(clean_data))) if len(clean_data) > 1000 else clean_data

                # Calculate correlation for additional insight
                correlation = data[x_col].corr(data[y_col])
                correlation_text = f"상관계수: {correlation:.3f}" if not pd.isna(correlation) else ""

                fig = go.Figure(data=go.Scatter(
                    x=data[x_col].tolist(),
                    y=data[y_col].tolist(),
                    mode='markers',
                    marker=dict(
                        size=8,
                        color='#2E86C1',
                        opacity=0.7,
                        line=dict(color='white', width=0.5)
                    ),
                    hovertemplate=(
                        f"<b>{x_col}</b>: %{{x}}<br>"
                        f"<b>{y_col}</b>: %{{y}}<br>"
                        "<extra></extra>"
                    ),
                    name=f"{y_col} vs {x_col}"
                ))

                # Add trend line if correlation is significant
                if not pd.isna(correlation) and abs(correlation) > 0.3:
                    # Calculate trend line
                    z = np.polyfit(data[x_col], data[y_col], 1)
                    p = np.poly1d(z)

                    # Add trend line
                    fig.add_trace(go.Scatter(
                        x=data[x_col].tolist(),
                        y=p(data[x_col]).tolist(),
                        mode='lines',
                        name=f'추세선 (r={correlation:.3f})',
                        line=dict(color='#E74C3C', width=2, dash='dash'),
                        hovertemplate='<b>추세선</b><br><extra></extra>'
                    ))
            
            # Create title with correlation info
            title_text = f"<b>{y_col} vs {x_col} 산포도</b>"
            if correlation_text:
                title_text += f"<br><sub>{correlation_text}</sub>"
            
            fig.update_layout(
                title=dict(
                    text=title_text,
                    font=dict(size=18, color='#2C3E50', family="Arial, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                xaxis=dict(
                    title=dict(text=f"<b>{x_col}</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)',
                    linecolor='rgba(211,211,211,0.5)'
                ),
                yaxis=dict(
                    title=dict(text=f"<b>{y_col}</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)',
                    linecolor='rgba(211,211,211,0.5)'
                ),
                plot_bgcolor='rgba(248,249,250,0.02)',
                paper_bgcolor='white',
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                margin=dict(l=60, r=30, t=80, b=60),
                hovermode='closest',
                showlegend=True if not pd.isna(correlation) and abs(correlation) > 0.3 else False
            )

            result = fig.to_dict()
            print(f"✅ Successfully created scatter plot with {len(data)} points")
            return result

        except Exception as e:
            print(f"❌ Scatter plot creation failed: {str(e)}")
            return self._create_default_chart(df, f"Scatter plot creation failed: {str(e)}")
    
    def _create_histogram_chart(self, df: pd.DataFrame, x_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style histogram for data distribution analysis"""
        try:
            # Ensure numeric data for histogram
            if x_col not in df.columns:
                return self._create_default_chart(df, f"Column {x_col} not found")
            
            data = pd.to_numeric(df[x_col], errors='coerce').dropna()
            
            if len(data) == 0:
                return self._create_default_chart(df, f"No numeric data found in column {x_col}")
            
            fig = go.Figure(data=[go.Histogram(
                x=data.tolist(),
                nbinsx=30,  # 적절한 bin 수
                marker=dict(
                    color='#3498DB',
                    opacity=0.7,
                    line=dict(color='white', width=1)
                ),
                hovertemplate=(
                    "<b>구간</b>: %{x}<br>"
                    "<b>빈도</b>: %{y}<br>"
                    "<extra></extra>"
                ),
                name=f"{x_col} 분포"
            )])
            
            fig.update_layout(
                title=dict(
                    text=f"<b>{x_col} 히스토그램</b>",
                    font=dict(size=18, color='#2C3E50', family="Arial, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                xaxis=dict(
                    title=dict(text=f"<b>{x_col}</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)'
                ),
                yaxis=dict(
                    title=dict(text="<b>빈도</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)'
                ),
                plot_bgcolor='rgba(248,249,250,0.02)',
                paper_bgcolor='white',
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                margin=dict(l=60, r=30, t=80, b=60),
                showlegend=False
            )
            
            return fig.to_dict()
            
        except Exception as e:
            return self._create_default_chart(df, f"Histogram creation failed: {str(e)}")
    
    def _create_box_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style box plot for statistical analysis"""
        try:
            print(f"📦 Creating box chart with X: {x_col}, Y: {y_col}")
            print(f"📋 DataFrame columns: {list(df.columns)}")
            print(f"📊 DataFrame shape: {df.shape}")

            if x_col not in df.columns or y_col not in df.columns:
                error_msg = f"Columns not found: {x_col}, {y_col}"
                print(f"❌ {error_msg}")
                return self._create_default_chart(df, error_msg)

            print(f"📈 Data types - X: {df[x_col].dtype}, Y: {df[y_col].dtype}")
            print(f"🔢 Sample Y values: {df[y_col].head().tolist()}")

            # Y 컬럼이 숫자형이어야 함
            y_data = pd.to_numeric(df[y_col], errors='coerce')
            non_null_count = y_data.notna().sum()
            print(f"🔢 Non-null numeric Y values: {non_null_count} out of {len(y_data)}")

            if y_data.isna().all():
                error_msg = f"No numeric data in column {y_col}"
                print(f"❌ {error_msg}")
                return self._create_default_chart(df, error_msg)
            
            fig = go.Figure()
            
            # 카테고리별로 박스 플롯 생성
            categories = df[x_col].unique()[:10]  # 최대 10개 카테고리
            
            colors = ['#3498DB', '#2ECC71', '#F39C12', '#E74C3C', '#9B59B6', 
                     '#1ABC9C', '#F1C40F', '#E67E22', '#34495E', '#95A5A6']
            
            for i, category in enumerate(categories):
                category_data = df[df[x_col] == category][y_col]
                category_data = pd.to_numeric(category_data, errors='coerce').dropna()
                
                if len(category_data) > 0:
                    fig.add_trace(go.Box(
                        y=category_data.tolist(),
                        name=str(category),
                        marker_color=colors[i % len(colors)],
                        boxpoints='outliers',
                        hovertemplate=(
                            f"<b>{x_col}</b>: {category}<br>"
                            "<b>Q1</b>: %{q1}<br>"
                            "<b>중위값</b>: %{median}<br>"
                            "<b>Q3</b>: %{q3}<br>"
                            "<extra></extra>"
                        )
                    ))
            
            fig.update_layout(
                title=dict(
                    text=f"<b>{x_col}별 {y_col} 박스 플롯</b>",
                    font=dict(size=18, color='#2C3E50', family="Arial, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                xaxis=dict(
                    title=dict(text=f"<b>{x_col}</b>", font=dict(size=14, color='#34495E'))
                ),
                yaxis=dict(
                    title=dict(text=f"<b>{y_col}</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)'
                ),
                plot_bgcolor='rgba(248,249,250,0.02)',
                paper_bgcolor='white',
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                margin=dict(l=60, r=30, t=80, b=60)
            )
            
            return fig.to_dict()
            
        except Exception as e:
            return self._create_default_chart(df, f"Box plot creation failed: {str(e)}")
    
    def _create_area_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style area chart for trend visualization"""
        try:
            if x_col not in df.columns or y_col not in df.columns:
                return self._create_default_chart(df, f"Columns not found: {x_col}, {y_col}")
            
            # 데이터 정렬
            data = df[[x_col, y_col]].copy()
            data[y_col] = pd.to_numeric(data[y_col], errors='coerce')
            data = data.dropna().head(100)  # 성능을 위해 제한
            
            if len(data) == 0:
                return self._create_default_chart(df, "No valid data for area chart")
            
            fig = go.Figure(data=go.Scatter(
                x=data[x_col].tolist(),
                y=data[y_col].tolist(),
                mode='lines',
                fill='tonexty',
                line=dict(color='#3498DB', width=2),
                fillcolor='rgba(52, 152, 219, 0.3)',
                hovertemplate=(
                    f"<b>{x_col}</b>: %{{x}}<br>"
                    f"<b>{y_col}</b>: %{{y:,.2f}}<br>"
                    "<extra></extra>"
                ),
                name=f"{y_col} 영역"
            ))
            
            fig.update_layout(
                title=dict(
                    text=f"<b>{y_col} 영역 차트 ({x_col} 기준)</b>",
                    font=dict(size=18, color='#2C3E50', family="Arial, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                xaxis=dict(
                    title=dict(text=f"<b>{x_col}</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)'
                ),
                yaxis=dict(
                    title=dict(text=f"<b>{y_col}</b>", font=dict(size=14, color='#34495E')),
                    gridcolor='rgba(211,211,211,0.3)'
                ),
                plot_bgcolor='rgba(248,249,250,0.02)',
                paper_bgcolor='white',
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                margin=dict(l=60, r=30, t=80, b=60),
                showlegend=False
            )
            
            return fig.to_dict()
            
        except Exception as e:
            return self._create_default_chart(df, f"Area chart creation failed: {str(e)}")
    
    def _create_heatmap_chart(self, df: pd.DataFrame, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Professional-style heatmap for correlation analysis"""
        try:
            # 숫자형 컬럼들의 상관관계 매트릭스 생성
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            
            if len(numeric_cols) < 2:
                return self._create_default_chart(df, "At least 2 numeric columns required for heatmap")
            
            # 상관관계 계산
            corr_matrix = df[numeric_cols].corr()
            
            fig = go.Figure(data=go.Heatmap(
                z=corr_matrix.values,
                x=corr_matrix.columns.tolist(),
                y=corr_matrix.columns.tolist(),
                colorscale='RdBu',
                zmid=0,
                text=corr_matrix.round(3).values,
                texttemplate="%{text}",
                textfont={"size": 10},
                hovertemplate=(
                    "<b>%{y}</b> vs <b>%{x}</b><br>"
                    "상관계수: %{z:.3f}<br>"
                    "<extra></extra>"
                )
            ))
            
            fig.update_layout(
                title=dict(
                    text="<b>변수 간 상관관계 히트맵</b>",
                    font=dict(size=18, color='#2C3E50', family="Arial, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                xaxis=dict(
                    title=dict(text="<b>변수</b>", font=dict(size=14, color='#34495E'))
                ),
                yaxis=dict(
                    title=dict(text="<b>변수</b>", font=dict(size=14, color='#34495E'))
                ),
                paper_bgcolor='white',
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                margin=dict(l=80, r=80, t=80, b=60)
            )
            
            return fig.to_dict()
            
        except Exception as e:
            return self._create_default_chart(df, f"Heatmap creation failed: {str(e)}")
    
    # ==================== ADVANCED STATISTICAL CHARTS ====================
    
    def _create_violin_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Violin plot for distribution analysis"""
        try:
            if x_col not in df.columns or y_col not in df.columns:
                return self._create_default_chart(df, f"Columns not found: {x_col}, {y_col}")
            
            fig = px.violin(df, x=x_col, y=y_col, box=True, points='all')
            fig.update_layout(
                title=f"<b>{x_col}별 {y_col} 바이올린 플롯</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white',
                plot_bgcolor='rgba(248,249,250,0.02)'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Violin plot creation failed: {str(e)}")
    
    def _create_strip_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Strip plot for distribution with jitter"""
        try:
            fig = px.strip(df, x=x_col, y=y_col)
            fig.update_layout(
                title=f"<b>{x_col}별 {y_col} 스트립 플롯</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Strip plot creation failed: {str(e)}")
    
    def _create_density_contour(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Density contour plot"""
        try:
            fig = px.density_contour(df, x=x_col, y=y_col)
            fig.update_layout(
                title=f"<b>{x_col} vs {y_col} 밀도 등고선</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Density contour creation failed: {str(e)}")
    
    def _create_density_heatmap(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Density heatmap"""
        try:
            fig = px.density_heatmap(df, x=x_col, y=y_col)
            fig.update_layout(
                title=f"<b>{x_col} vs {y_col} 밀도 히트맵</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Density heatmap creation failed: {str(e)}")
    
    # ==================== SPECIALIZED CHARTS ====================
    
    def _create_funnel_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Funnel chart for conversion analysis"""
        try:
            fig = px.funnel(df, x=y_col, y=x_col)
            fig.update_layout(
                title=f"<b>{x_col} 깔때기 차트</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Funnel chart creation failed: {str(e)}")
    
    def _create_waterfall_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Waterfall chart for cumulative effect"""
        try:
            # Use Plotly's waterfall chart
            fig = go.Figure(go.Waterfall(
                name="", 
                orientation="v",
                measure=["relative"] * (len(df) - 1) + ["total"],
                x=df[x_col].tolist(),
                y=df[y_col].tolist(),
                connector={"line": {"color": "rgb(63, 63, 63)"}},
            ))
            
            fig.update_layout(
                title=f"<b>{x_col} 폭포 차트</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Waterfall chart creation failed: {str(e)}")
    
    def _create_treemap_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Treemap for hierarchical data"""
        try:
            fig = px.treemap(df, path=[x_col], values=y_col)
            fig.update_layout(
                title=f"<b>{x_col} 트리맵</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Treemap creation failed: {str(e)}")
    
    def _create_sunburst_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Sunburst chart for hierarchical data"""
        try:
            fig = px.sunburst(df, path=[x_col], values=y_col)
            fig.update_layout(
                title=f"<b>{x_col} 선버스트 차트</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Sunburst creation failed: {str(e)}")
    
    # ==================== 3D CHARTS ====================
    
    def _create_scatter_3d(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """3D scatter plot"""
        try:
            # Get third column for Z axis
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            z_col = None
            for col in numeric_cols:
                if col not in [x_col, y_col]:
                    z_col = col
                    break
            
            if not z_col:
                z_col = y_col  # Fallback
            
            fig = px.scatter_3d(df, x=x_col, y=y_col, z=z_col)
            fig.update_layout(
                title=f"<b>3D 산점도: {x_col}, {y_col}, {z_col}</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"3D scatter creation failed: {str(e)}")
    
    def _create_surface_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """3D surface plot"""
        try:
            # Create a pivot table for surface plot
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if len(numeric_cols) >= 3:
                z_col = [col for col in numeric_cols if col not in [x_col, y_col]][0]
                
                # Create pivot for surface
                pivot_df = df.pivot_table(values=z_col, index=y_col, columns=x_col, aggfunc='mean')
                
                fig = go.Figure(data=[go.Surface(z=pivot_df.values, x=pivot_df.columns, y=pivot_df.index)])
                fig.update_layout(
                    title=f"<b>3D 표면 차트: {z_col}</b>",
                    font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                    paper_bgcolor='white'
                )
                return fig.to_dict()
            else:
                return self._create_default_chart(df, "Insufficient numeric columns for surface plot")
        except Exception as e:
            return self._create_default_chart(df, f"Surface plot creation failed: {str(e)}")
    
    # ==================== FINANCIAL CHARTS ====================
    
    def _create_candlestick(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Candlestick chart for financial data"""
        try:
            # Look for OHLC columns
            ohlc_cols = {}
            for col in df.columns:
                col_lower = col.lower()
                if 'open' in col_lower:
                    ohlc_cols['open'] = col
                elif 'high' in col_lower:
                    ohlc_cols['high'] = col
                elif 'low' in col_lower:
                    ohlc_cols['low'] = col
                elif 'close' in col_lower:
                    ohlc_cols['close'] = col
            
            if len(ohlc_cols) >= 4:
                fig = go.Figure(data=go.Candlestick(
                    x=df[x_col],
                    open=df[ohlc_cols['open']],
                    high=df[ohlc_cols['high']],
                    low=df[ohlc_cols['low']],
                    close=df[ohlc_cols['close']]
                ))
                fig.update_layout(
                    title="<b>캔들스틱 차트</b>",
                    font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                    paper_bgcolor='white'
                )
                return fig.to_dict()
            else:
                return self._create_default_chart(df, "OHLC columns not found for candlestick chart")
        except Exception as e:
            return self._create_default_chart(df, f"Candlestick creation failed: {str(e)}")
    
    # ==================== MULTIVARIATE CHARTS ====================
    
    def _create_parallel_coordinates(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parallel coordinates plot"""
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:6]  # Limit for performance
            if len(numeric_cols) >= 2:
                fig = px.parallel_coordinates(df, dimensions=numeric_cols)
                fig.update_layout(
                    title="<b>평행 좌표 플롯</b>",
                    font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                    paper_bgcolor='white'
                )
                return fig.to_dict()
            else:
                return self._create_default_chart(df, "Insufficient numeric columns for parallel coordinates")
        except Exception as e:
            return self._create_default_chart(df, f"Parallel coordinates creation failed: {str(e)}")
    
    def _create_parallel_categories(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parallel categories plot"""
        try:
            categorical_cols = df.select_dtypes(include=['object']).columns.tolist()[:4]  # Limit for performance
            if len(categorical_cols) >= 2:
                fig = px.parallel_categories(df, dimensions=categorical_cols)
                fig.update_layout(
                    title="<b>평행 카테고리 플롯</b>",
                    font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                    paper_bgcolor='white'
                )
                return fig.to_dict()
            else:
                return self._create_default_chart(df, "Insufficient categorical columns for parallel categories")
        except Exception as e:
            return self._create_default_chart(df, f"Parallel categories creation failed: {str(e)}")
    
    # ==================== SPECIALIZED VISUALIZATION ====================
    
    def _create_radar_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Radar/Spider chart"""
        try:
            # Get numeric columns for radar chart
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:8]  # Limit to 8 axes
            
            if len(numeric_cols) < 3:
                return self._create_default_chart(df, "Need at least 3 numeric columns for radar chart")
            
            # Take first row or aggregate
            if len(df) == 1:
                values = df[numeric_cols].iloc[0].tolist()
            else:
                values = df[numeric_cols].mean().tolist()
            
            fig = go.Figure()
            fig.add_trace(go.Scatterpolar(
                r=values,
                theta=numeric_cols,
                fill='toself',
                name='Data'
            ))
            
            fig.update_layout(
                polar=dict(
                    radialaxis=dict(visible=True)
                ),
                title="<b>레이더 차트</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Radar chart creation failed: {str(e)}")
    
    # ==================== DISTRIBUTION CHARTS ====================
    
    def _create_distplot(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Distribution plot with histogram and KDE"""
        try:
            if x_col not in df.columns:
                return self._create_default_chart(df, f"Column {x_col} not found")
            
            data = pd.to_numeric(df[x_col], errors='coerce').dropna()
            
            if len(data) == 0:
                return self._create_default_chart(df, f"No numeric data in column {x_col}")
            
            # Create distribution plot using figure factory
            fig = ff.create_distplot([data.tolist()], [x_col])
            fig.update_layout(
                title=f"<b>{x_col} 분포 플롯</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"Distribution plot creation failed: {str(e)}")
    
    def _create_ecdf(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Empirical Cumulative Distribution Function"""
        try:
            fig = px.ecdf(df, x=x_col)
            fig.update_layout(
                title=f"<b>{x_col} 누적분포함수 (ECDF)</b>",
                font=dict(family="Arial, sans-serif", size=12, color='#2C3E50'),
                paper_bgcolor='white'
            )
            return fig.to_dict()
        except Exception as e:
            return self._create_default_chart(df, f"ECDF creation failed: {str(e)}")

    # ==================== GEO CHARTS ====================

    def _create_choropleth_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Choropleth map for geographic data visualization"""
        try:
            print(f"🗺️ Creating choropleth chart with X: {x_col}, Y: {y_col}")

            if x_col not in df.columns or y_col not in df.columns:
                return self._create_default_chart(df, f"Columns not found: {x_col}, {y_col}")

            # Clean and prepare data
            data = df[[x_col, y_col]].copy()
            data[y_col] = pd.to_numeric(data[y_col], errors='coerce')
            data = data.dropna()

            if len(data) == 0:
                return self._create_default_chart(df, "No valid data for choropleth")

            # Detect location type and set appropriate parameters
            location_col = x_col

            # Check if locations are country codes or names
            sample_locations = data[location_col].astype(str).str.upper().unique()[:5]

            # Common country codes (ISO 3166-1 alpha-2 and alpha-3)
            country_codes_2 = {'US', 'CN', 'JP', 'DE', 'GB', 'FR', 'IN', 'IT', 'BR', 'CA', 'RU', 'KR', 'ES', 'AU', 'MX', 'ID', 'NL', 'SA', 'TR', 'CH'}
            country_codes_3 = {'USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'IND', 'ITA', 'BRA', 'CAN', 'RUS', 'KOR', 'ESP', 'AUS', 'MEX', 'IDN', 'NLD', 'SAU', 'TUR', 'CHE'}

            # Korean location detection
            korean_locations = {'서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '한국', '대한민국'}

            locationmode = None
            geo_scope = 'world'

            # Determine location type
            if any(loc in country_codes_2 for loc in sample_locations):
                locationmode = 'ISO-3'  # Plotly expects ISO-3 but will handle ISO-2
                print("📍 Detected country codes (ISO-2)")
            elif any(loc in country_codes_3 for loc in sample_locations):
                locationmode = 'ISO-3'
                print("📍 Detected country codes (ISO-3)")
            elif any(loc in korean_locations for loc in sample_locations):
                # For Korean locations, we'll use text-based matching
                locationmode = 'geojson-id'  # Will need custom geojson for Korean regions
                geo_scope = 'asia'
                print("📍 Detected Korean locations")
            else:
                # Try country names
                locationmode = 'country names'
                print("📍 Using country names")

            # Create choropleth map
            if locationmode == 'geojson-id' and geo_scope == 'asia':
                # For Korean regions, create a simplified map
                fig = go.Figure(data=go.Choropleth(
                    locations=data[location_col],
                    z=data[y_col],
                    locationmode='country names',  # Fallback to country names
                    text=data[location_col],
                    colorscale='Viridis',
                    colorbar=dict(
                        title=dict(text=y_col, font=dict(size=14)),
                        tickfont=dict(size=12)
                    ),
                    hovertemplate=(
                        f"<b>%{{text}}</b><br>"
                        f"<b>{y_col}</b>: %{{z:,.0f}}<br>"
                        "<extra></extra>"
                    )
                ))
            else:
                fig = go.Figure(data=go.Choropleth(
                    locations=data[location_col],
                    z=data[y_col],
                    locationmode=locationmode,
                    text=data[location_col],
                    colorscale='Viridis',
                    colorbar=dict(
                        title=dict(text=y_col, font=dict(size=14)),
                        tickfont=dict(size=12)
                    ),
                    hovertemplate=(
                        f"<b>%{{text}}</b><br>"
                        f"<b>{y_col}</b>: %{{z:,.0f}}<br>"
                        "<extra></extra>"
                    )
                ))

            fig.update_layout(
                title=dict(
                    text=f"<b>{y_col}</b> <span style='color:#6b7280'>분포 by</span> <b>{x_col}</b>",
                    font=dict(size=20, color='#1f2937', family="Inter, -apple-system, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                geo=dict(
                    scope=geo_scope,
                    projection_type='equirectangular',
                    showframe=False,
                    showcoastlines=True,
                    coastlinecolor="rgba(204,204,204,0.4)",
                    showland=True,
                    landcolor='rgba(243,244,246,0.3)',
                    showocean=True,
                    oceancolor='rgba(219,234,254,0.2)',
                    showlakes=True,
                    lakecolor='rgba(219,234,254,0.2)',
                    projection=dict(
                        rotation=dict(lon=0, lat=0)
                    )
                ),
                paper_bgcolor='white',
                font=dict(family="Inter, -apple-system, sans-serif", size=12, color='#374151'),
                margin=dict(l=0, r=0, t=100, b=0),
                height=600
            )

            print(f"✅ Successfully created choropleth map with {len(data)} regions")
            return fig.to_dict()

        except Exception as e:
            print(f"❌ Choropleth creation failed: {str(e)}")
            return self._create_default_chart(df, f"Choropleth creation failed: {str(e)}")

    def _create_scattergeo_chart(self, df: pd.DataFrame, x_col: str, y_col: str, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Scatter plot on geographic map"""
        try:
            print(f"🗺️ Creating scatter geo chart with X: {x_col}, Y: {y_col}")

            # Look for latitude and longitude columns
            lat_col = None
            lon_col = None

            for col in df.columns:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['lat', 'latitude', '위도']):
                    lat_col = col
                elif any(keyword in col_lower for keyword in ['lon', 'lng', 'longitude', '경도']):
                    lon_col = col

            if not lat_col or not lon_col:
                # Try to use x_col and y_col as coordinates if they're numeric
                if (x_col in df.columns and y_col in df.columns and
                    pd.api.types.is_numeric_dtype(df[x_col]) and pd.api.types.is_numeric_dtype(df[y_col])):
                    lon_col = x_col
                    lat_col = y_col
                else:
                    return self._create_default_chart(df, "Latitude and longitude columns not found")

            # Clean data
            data = df[[lat_col, lon_col]].copy()
            data[lat_col] = pd.to_numeric(data[lat_col], errors='coerce')
            data[lon_col] = pd.to_numeric(data[lon_col], errors='coerce')
            data = data.dropna()

            if len(data) == 0:
                return self._create_default_chart(df, "No valid coordinate data")

            # Add size column if available
            size_col = None
            for col in df.columns:
                if col not in [lat_col, lon_col] and pd.api.types.is_numeric_dtype(df[col]):
                    size_col = col
                    break

            if size_col:
                data[size_col] = pd.to_numeric(df[size_col], errors='coerce').fillna(1)
                sizes = data[size_col].tolist()
            else:
                sizes = [10] * len(data)

            fig = go.Figure(data=go.Scattergeo(
                lon=data[lon_col],
                lat=data[lat_col],
                text=[f"({lat:.2f}, {lon:.2f})" for lat, lon in zip(data[lat_col], data[lon_col])],
                mode='markers',
                marker=dict(
                    size=sizes,
                    color='rgba(99, 102, 241, 0.8)',
                    line=dict(width=1, color='white'),
                    sizemode='diameter',
                    sizeref=max(sizes) / 50 if sizes else 1
                ),
                hovertemplate=(
                    f"<b>위도</b>: %{{lat}}<br>"
                    f"<b>경도</b>: %{{lon}}<br>"
                    f"<b>크기</b>: %{{marker.size}}<br>" if size_col else ""
                    "<extra></extra>"
                ),
                name='위치'
            ))

            fig.update_layout(
                title=dict(
                    text=f"<b>지리적 분포</b> <span style='color:#6b7280'>({lat_col}, {lon_col})</span>",
                    font=dict(size=20, color='#1f2937', family="Inter, -apple-system, sans-serif"),
                    x=0.5, xanchor='center'
                ),
                geo=dict(
                    projection_type='natural earth',
                    showframe=False,
                    showcoastlines=True,
                    coastlinecolor="rgba(204,204,204,0.4)",
                    showland=True,
                    landcolor='rgba(243,244,246,0.3)',
                    showocean=True,
                    oceancolor='rgba(219,234,254,0.2)',
                    showlakes=True,
                    lakecolor='rgba(219,234,254,0.2)'
                ),
                paper_bgcolor='white',
                font=dict(family="Inter, -apple-system, sans-serif", size=12, color='#374151'),
                margin=dict(l=0, r=0, t=100, b=0),
                height=600
            )

            print(f"✅ Successfully created scatter geo chart with {len(data)} points")
            return fig.to_dict()

        except Exception as e:
            print(f"❌ Scatter geo creation failed: {str(e)}")
            return self._create_default_chart(df, f"Scatter geo creation failed: {str(e)}")

    def _create_default_chart(self, df: pd.DataFrame, error_msg: str) -> Dict[str, Any]:
        """기본 차트 (에러 시)"""
        fig = go.Figure(data=[
            go.Bar(
                x=['Error'],
                y=[1],
                text=[f"Chart generation failed: {error_msg}"],
                textposition='auto',
                marker_color='rgb(200, 100, 100)'
            )
        ])
        
        fig.update_layout(
            title="Chart Generation Error",
            showlegend=False
        )
        
        return fig.to_dict()