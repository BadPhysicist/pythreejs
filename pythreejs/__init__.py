from ._version import version_info, __version__
from ._package import npm_pkg_name, py_pkg_name

from .pythreejs import (
    Texture,
    ImageTexture,
    DataTexture,
    Color,
    Object3d,
    ScaledObject,
    Controls,
    OrbitControls,
    FlyControls,
    TrackballControls,
    Picker,
    Geometry,
    PlainGeometry,
    SphereGeometry,
    CylinderGeometry,
    BoxGeometry,
    CircleGeometry,
    LatheGeometry,
    TubeGeometry,
    IcosahedronGeometry,
    OctahedronGeometry,
    PlaneGeometry,
    TetrahedronGeometry,
    TorusGeometry,
    TorusKnotGeometry,
    PolyhedronGeometry,
    RingGeometry,
    SurfaceGeometry,
    FaceGeometry,
    ParametricGeometry,
    Material,
    BasicMaterial,
    LambertMaterial,
    PhongMaterial,
    DepthMaterial,
    LineBasicMaterial,
    LineDashedMaterial,
    NormalMaterial,
    ParticleSystemMaterial,
    ShaderMaterial,
    SpriteMaterial,
    Sprite,
    TextTexture,
    Mesh,
    Line,
    PlotMesh,
    Camera,
    PerspectiveCamera,
    OrthographicCamera,
    Scene,
    Effect,
    AnaglyphEffect,
    Renderer,
    Light,
    AmbientLight,
    IntensityLight,
    HemisphereLight,
    DirectionalLight,
    PointLight,
    SpotLight,
    SurfaceGrid,
    lights_color,
    lights_gray,
    make_text,
    height_texture,
)


# don't include install_nbextension and the lights functions when we import *
__all__ = ["Texture",
           "ImageTexture",
           "DataTexture",
           "Color",
           "Object3d",
           "ScaledObject",
           "Controls",
           "OrbitControls",
           "FlyControls",
           "TrackballControls",
           "Picker",
           "Geometry",
           "PlainGeometry",
           "SphereGeometry",
           "CylinderGeometry",
           "BoxGeometry",
           "CircleGeometry",
           "LatheGeometry",
           "TubeGeometry",
           "IcosahedronGeometry",
           "OctahedronGeometry",
           "PlaneGeometry",
           "TetrahedronGeometry",
           "TorusGeometry",
           "TorusKnotGeometry",
           "PolyhedronGeometry",
           "RingGeometry",
           "SurfaceGeometry",
           "FaceGeometry",
           "ParametricGeometry",
           "Material",
           "BasicMaterial",
           "LambertMaterial",
           "PhongMaterial",
           "DepthMaterial",
           "LineBasicMaterial",
           "LineDashedMaterial",
           "NormalMaterial",
           "ParticleSystemMaterial",
           "ShaderMaterial",
           "SpriteMaterial",
           "Sprite",
           "TextTexture",
           "Mesh",
           "Line",
           "PlotMesh",
           "Camera",
           "PerspectiveCamera",
           "OrthographicCamera",
           "Scene",
           "Effect",
           "AnaglyphEffect",
           "Renderer",
           "Light",
           "AmbientLight",
           "IntensityLight",
           "HemisphereLight",
           "DirectionalLight",
           "PointLight",
           "SpotLight",
           "SurfaceGrid",
           "make_text",
           "height_texture",
       ]

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': npm_pkg_name,
        'require': npm_pkg_name + '/extension'
    }]
